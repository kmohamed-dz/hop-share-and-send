import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const ONBOARDING_FLAG_KEY = "maak_onboarding_done";
const REDIRECT_AFTER_LOGIN_KEY = "maak_redirect_after_login";

function isOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith("/auth/login") || pathname.startsWith("/auth/profile-setup") || pathname.startsWith("/profile/setup");
}

function isProtectedPath(pathname: string): boolean {
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

function isProfileComplete(profile: Record<string, unknown> | null, session: Session | null): boolean {
  if (!profile || !session?.user) return false;

  const fullName = (profile.full_name as string | undefined) ?? (profile.name as string | undefined);
  const rolePref = (profile.role_pref as string | undefined) ?? (profile.role_preference as string | undefined);

  const phoneFromAuth = session.user.phone;
  const phoneConfirmedAt = (session.user as { phone_confirmed_at?: string | null }).phone_confirmed_at;
  const phoneVerified = Boolean(phoneFromAuth) && (phoneConfirmedAt ? Boolean(phoneConfirmedAt) : true);

  return Boolean(fullName?.trim()) && Boolean(rolePref?.trim()) && phoneVerified;
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

  const computedProfileComplete = useMemo(() => isProfileComplete(profile, session), [profile, session]);

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

      if (isOnboardingPath(pathname) || pathname === "/auth/profile-setup" || pathname === "/profile/setup") {
        navigate("/auth/login", { replace: true });
        return;
      }

      if (!isAuthPath(pathname) && !isOnboardingPath(pathname) && pathname !== "/auth/login") {
        navigate("/auth/login", { replace: true });
      }
      return;
    }

    if (!onboardingDone) {
      localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    }

    if (!computedProfileComplete) {
      if (pathname !== "/auth/profile-setup") {
        navigate("/auth/profile-setup", { replace: true });
      }
      return;
    }

    if (isOnboardingPath(pathname) || pathname === "/auth/login" || pathname === "/auth/profile-setup" || pathname === "/profile/setup") {
      const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
      if (redirectPath && redirectPath !== "/auth/login" && redirectPath !== "/auth/profile-setup") {
        localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        if (redirectPath !== pathname) {
          navigate(redirectPath, { replace: true });
          return;
        }
      }

      if (pathname !== "/") {
        navigate("/", { replace: true });
      }
    }
  }, [computedProfileComplete, loading, location, navigate, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm font-semibold text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return <Outlet />;
}

export { ONBOARDING_FLAG_KEY, REDIRECT_AFTER_LOGIN_KEY };
