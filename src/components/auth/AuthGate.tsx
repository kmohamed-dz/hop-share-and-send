import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { LANGUAGE_STORAGE_KEY } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { isEmailVerifiedSession, isProfileRecordComplete } from "@/lib/authState";
import { syncMarketplaceExpirations } from "@/lib/marketplace";
import { toast } from "sonner";

const ONBOARDING_FLAG_KEY = "maak_onboarding_done";
const REDIRECT_AFTER_LOGIN_KEY = "maak_redirect_after_login";
const PENDING_VERIFICATION_EMAIL_KEY = "maak_pending_verification_email";
const ONBOARDING_ROLE_KEY = "maak_onboarding_role";

const LOGIN_PATH = "/auth/login";
const SIGNUP_PATH = "/auth/signup";
const VERIFY_PATH = "/auth/verify";
const CALLBACK_PATH = "/auth/callback";
const RESET_PASSWORD_PATH = "/auth/reset-password";
const PROFILE_SETUP_PATH = "/auth/profile-setup";
const PROFILE_SETUP_ALIAS_PATH = "/profile/setup";
const ADMIN_PATH = "/admin";

function isOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

function isLoginPath(pathname: string): boolean {
  return pathname.startsWith(LOGIN_PATH);
}

function isSignupPath(pathname: string): boolean {
  return pathname.startsWith(SIGNUP_PATH);
}

function isVerifyPath(pathname: string): boolean {
  return pathname.startsWith(VERIFY_PATH);
}

function isCallbackPath(pathname: string): boolean {
  return pathname.startsWith(CALLBACK_PATH);
}

function isResetPasswordPath(pathname: string): boolean {
  return pathname.startsWith(RESET_PASSWORD_PATH);
}

function isProfileSetupPath(pathname: string): boolean {
  return pathname.startsWith(PROFILE_SETUP_PATH) || pathname.startsWith(PROFILE_SETUP_ALIAS_PATH);
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PATH);
}

function isPublicEntryPath(pathname: string): boolean {
  return (
    isOnboardingPath(pathname) ||
    isLoginPath(pathname) ||
    isSignupPath(pathname) ||
    isVerifyPath(pathname) ||
    isCallbackPath(pathname) ||
    isResetPasswordPath(pathname) ||
    isProfileSetupPath(pathname)
  );
}

function isProtectedPath(pathname: string): boolean {
  if (isPublicEntryPath(pathname)) return false;

  return (
    pathname === "/" ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/trips/create") ||
    pathname.startsWith("/parcels/create") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/deals") ||
    pathname.startsWith("/safety") ||
    pathname.startsWith("/processus") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/admin") ||
    pathname.includes("/matches")
  );
}

function resolveAccessDeniedMessage(): string {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "ar"
    ? "تم رفض الوصول: هذه الصفحة مخصصة للمشرف فقط."
    : "Accès refusé: cette page est réservée à l'administrateur.";
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
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

      const profilesResult = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (!cancelled && !profilesResult.error && profilesResult.data) {
        setProfile(profilesResult.data as unknown as Record<string, unknown>);
        setProfileLoading(false);
        return;
      }

      const fallback = await supabase.from("users_profile" as never).select("*").eq("user_id", userId).maybeSingle();
      if (!cancelled) {
        setProfile((fallback?.data as Record<string, unknown> | null) ?? null);
        setProfileLoading(false);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loading = sessionLoading || (Boolean(session?.user) && profileLoading);

  const emailVerified = useMemo(() => isEmailVerifiedSession(session), [session]);
  const computedProfileComplete = useMemo(() => isProfileRecordComplete(profile), [profile]);
  const isAdmin = useMemo(() => profile?.is_admin === true, [profile]);

  useEffect(() => {
    if (!userId) return;
    void syncMarketplaceExpirations();
  }, [userId]);

  useEffect(() => {
    if (loading) return;

    const { pathname, search, hash } = location;
    const currentPath = `${pathname}${search}${hash}`;
    const onboardingDone = localStorage.getItem(ONBOARDING_FLAG_KEY) === "true";
    const authSpecialPath = isCallbackPath(pathname) || isResetPasswordPath(pathname);

    if (authSpecialPath) {
      return;
    }

    if (!session?.user) {
      if (isProtectedPath(pathname)) {
        localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, currentPath);
      }

      if (!onboardingDone) {
        if (!isOnboardingPath(pathname)) {
          navigate("/onboarding/welcome", { replace: true });
        }
        return;
      }

      const pendingVerificationEmail = localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
      if (isVerifyPath(pathname) && pendingVerificationEmail) {
        return;
      }

      if (!isLoginPath(pathname) && !isSignupPath(pathname)) {
        navigate(LOGIN_PATH, { replace: true });
      }
      return;
    }

    if (!onboardingDone) {
      localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    }

    if (!emailVerified) {
      if (!isVerifyPath(pathname)) {
        navigate(VERIFY_PATH, { replace: true });
      }
      return;
    }

    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);

    if (!computedProfileComplete) {
      if (!isProfileSetupPath(pathname)) {
        navigate(PROFILE_SETUP_PATH, { replace: true });
      }
      return;
    }

    if (isAdminPath(pathname) && !isAdmin) {
      toast.error(resolveAccessDeniedMessage());
      navigate("/", { replace: true });
      return;
    }

    localStorage.removeItem(ONBOARDING_ROLE_KEY);

    if (isPublicEntryPath(pathname)) {
      const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
      if (redirectPath && !isPublicEntryPath(redirectPath)) {
        localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        if (redirectPath !== pathname) {
          navigate(redirectPath, { replace: true });
          return;
        }
      }

      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      if (pathname !== "/") {
        navigate("/", { replace: true });
      }
    }
  }, [computedProfileComplete, emailVerified, isAdmin, loading, location, navigate, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="rounded-2xl border border-border/70 bg-card px-8 py-6 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export { ONBOARDING_FLAG_KEY, REDIRECT_AFTER_LOGIN_KEY, PENDING_VERIFICATION_EMAIL_KEY, ONBOARDING_ROLE_KEY };
