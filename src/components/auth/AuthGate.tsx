import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LANGUAGE_STORAGE_KEY } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { isProfileRecordComplete } from "@/lib/authState";
import { syncMarketplaceExpirations } from "@/lib/marketplace";
import { fetchProfileByAuthUserId } from "@/lib/profile";

const ONBOARDING_FLAG_KEY = "maak_onboarding_done";
const REDIRECT_AFTER_LOGIN_KEY = "maak_redirect_after_login";
const PENDING_VERIFICATION_EMAIL_KEY = "maak_pending_verification_email";
const ONBOARDING_ROLE_KEY = "maak_onboarding_role";

const DASHBOARD_PATH = "/dashboard";
const ONBOARDING_PATH = "/onboarding";
const ONBOARDING_WELCOME_PATH = "/onboarding/welcome";
const ONBOARDING_ROLE_PATH = "/onboarding/role";
const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const FORGOT_PASSWORD_PATH = "/forgot-password";
const CALLBACK_PATH = "/auth/callback";
const UPDATE_PASSWORD_PATH = "/update-password";
const PROFILE_SETUP_PATH = "/auth/profile-setup";
const LEGACY_PROFILE_SETUP_PATH = "/profile/setup";

const LEGACY_LOGIN_PATH = "/auth/login";
const LEGACY_REGISTER_PATH = "/auth/signup";
const LEGACY_FORGOT_PASSWORD_PATH = "/auth/forgot-password";
const LEGACY_UPDATE_PASSWORD_PATH = "/auth/reset-password";
const LEGACY_VERIFY_PATH = "/auth/verify";

const ADMIN_PATH = "/admin";
const AUTH_SPECIAL_PATHS = [CALLBACK_PATH, UPDATE_PASSWORD_PATH, LEGACY_UPDATE_PASSWORD_PATH];
const PUBLIC_PREFIXES = [
  LOGIN_PATH,
  REGISTER_PATH,
  FORGOT_PASSWORD_PATH,
  CALLBACK_PATH,
  UPDATE_PASSWORD_PATH,
  ONBOARDING_WELCOME_PATH,
  ONBOARDING_ROLE_PATH,
  LEGACY_LOGIN_PATH,
  LEGACY_REGISTER_PATH,
  LEGACY_FORGOT_PASSWORD_PATH,
  LEGACY_UPDATE_PASSWORD_PATH,
  LEGACY_VERIFY_PATH,
];

function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PATH || pathname.startsWith("/onboarding/");
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PATH);
}

function isAuthSpecialPath(pathname: string): boolean {
  return AUTH_SPECIAL_PATHS.some((path) => pathname.startsWith(path));
}

function isPublicEntryPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((path) => pathname.startsWith(path));
}

function isProtectedPath(pathname: string): boolean {
  if (isPublicEntryPath(pathname)) {
    return false;
  }

  return true;
}

function isProfileSetupPath(pathname: string): boolean {
  return pathname.startsWith(PROFILE_SETUP_PATH) || pathname.startsWith(LEGACY_PROFILE_SETUP_PATH);
}

function resolveAccessDeniedMessage(): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "ar"
    ? "تم رفض الوصول: هذه الصفحة مخصصة للمشرف فقط."
    : "Accès refusé: cette page est réservée à l'administrateur.";
}

function isAdminProfile(profile: Record<string, unknown> | null): boolean {
  if (!profile) {
    return false;
  }

  if (profile.is_admin === true) {
    return true;
  }

  const role = typeof profile.role === "string" ? profile.role.toLowerCase() : "";
  return role === "admin";
}

export function AuthGate() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session ?? null);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setProfileLoading(true);
      const data = await fetchProfileByAuthUserId(userId);

      if (!cancelled) {
        setProfile(data);
        setProfileLoading(false);
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loading = sessionLoading || (Boolean(session?.user) && profileLoading);

  const computedProfileComplete = useMemo(
    () => isProfileRecordComplete(profile),
    [profile]
  );
  const isAdmin = useMemo(() => isAdminProfile(profile), [profile]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    void syncMarketplaceExpirations();
  }, [userId]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const { hash, pathname, search } = location;
    const currentPath = `${pathname}${search}${hash}`;

    if (isAuthSpecialPath(pathname)) {
      return;
    }

    if (!session?.user) {
      if (isProtectedPath(pathname)) {
        localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, currentPath);
      }

      const onboardingDone = localStorage.getItem(ONBOARDING_FLAG_KEY) === "true";

      if (!onboardingDone && !isOnboardingPath(pathname)) {
        navigate(ONBOARDING_WELCOME_PATH, { replace: true });
        return;
      }

      if (onboardingDone && isOnboardingPath(pathname)) {
        navigate(LOGIN_PATH, { replace: true });
        return;
      }

      if (!isPublicEntryPath(pathname) && !isOnboardingPath(pathname)) {
        navigate(LOGIN_PATH, { replace: true });
      }
      return;
    }

    localStorage.setItem(ONBOARDING_FLAG_KEY, "true");

    if (!computedProfileComplete) {
      if (!isProfileSetupPath(pathname)) {
        navigate(PROFILE_SETUP_PATH, { replace: true });
      }
      return;
    }

    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
    localStorage.removeItem(ONBOARDING_ROLE_KEY);

    if (isAdminPath(pathname) && !isAdmin) {
      toast.error(resolveAccessDeniedMessage(), { id: "auth-access-denied" });
      navigate(DASHBOARD_PATH, { replace: true });
      return;
    }

    if (
      isPublicEntryPath(pathname) ||
      pathname === "/" ||
      isOnboardingPath(pathname) ||
      isProfileSetupPath(pathname)
    ) {
      const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
      if (
        redirectPath &&
        isProtectedPath(redirectPath) &&
        !isOnboardingPath(redirectPath) &&
        !isProfileSetupPath(redirectPath)
      ) {
        localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        if (redirectPath !== pathname) {
          navigate(redirectPath, { replace: true });
          return;
        }
      }

      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      if (pathname !== DASHBOARD_PATH) {
        navigate(DASHBOARD_PATH, { replace: true });
      }
    }
  }, [computedProfileComplete, isAdmin, loading, location, navigate, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="rounded-2xl border border-border/70 bg-card px-8 py-6 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export {
  ONBOARDING_FLAG_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
  ONBOARDING_ROLE_KEY,
};
