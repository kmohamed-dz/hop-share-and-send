import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { syncMarketplaceExpirations } from "@/lib/marketplace";

const ONBOARDING_FLAG_KEY = "maak_onboarding_done";
const REDIRECT_AFTER_LOGIN_KEY = "maak_redirect_after_login";
const PENDING_VERIFICATION_EMAIL_KEY = "maak_pending_verification_email";
const ONBOARDING_ROLE_KEY = "maak_onboarding_role";

const LOGIN_PATH = "/auth/login";
const SIGNUP_PATH = "/auth/signup";
const VERIFY_PATH = "/auth/verify";
const PROFILE_SETUP_PATH = "/auth/profile-setup";
const PROFILE_SETUP_ALIAS_PATH = "/profile/setup";

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

function isProfileSetupPath(pathname: string): boolean {
  return pathname.startsWith(PROFILE_SETUP_PATH) || pathname.startsWith(PROFILE_SETUP_ALIAS_PATH);
}

function isPublicEntryPath(pathname: string): boolean {
  return (
    isOnboardingPath(pathname) ||
    isLoginPath(pathname) ||
    isSignupPath(pathname) ||
    isVerifyPath(pathname) ||
    isProfileSetupPath(pathname)
  );
}

function isEmailVerified(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;

  return Boolean(user.email && user.email_confirmed_at);
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
    pathname.includes("/matches")
  );
}

function isProfileComplete(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;

  const fullName = typeof profile.full_name === "string" ? profile.full_name.trim() : "";
  const wilaya = typeof profile.wilaya === "string" ? profile.wilaya.trim() : "";
  const nationalId = typeof profile.national_id === "string" ? profile.national_id.trim() : "";
  const profileCompleteFlag = typeof profile.profile_complete === "boolean" ? profile.profile_complete : null;
  const hasRequiredFields = Boolean(fullName) && Boolean(wilaya) && Boolean(nationalId);

  if (profileCompleteFlag === null) {
    return hasRequiredFields;
  }

  return profileCompleteFlag && hasRequiredFields;
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

  const emailVerified = useMemo(() => isEmailVerified(session), [session]);
  const computedProfileComplete = useMemo(() => isProfileComplete(profile), [profile]);

  useEffect(() => {
    if (!userId) return;
    void syncMarketplaceExpirations();
  }, [userId]);

  useEffect(() => {
    if (loading) return;

    const { pathname, search, hash } = location;
    const currentPath = `${pathname}${search}${hash}`;
    const onboardingDone = localStorage.getItem(ONBOARDING_FLAG_KEY) === "true";

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
  }, [computedProfileComplete, emailVerified, loading, location, navigate, session]);

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
