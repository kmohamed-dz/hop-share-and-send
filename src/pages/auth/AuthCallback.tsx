import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  ONBOARDING_FLAG_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
} from "@/components/auth/AuthGate";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { isEmailVerifiedUser, isProfileRecordComplete } from "@/lib/authState";
import { resolveSessionFromAuthUrl } from "@/lib/authRedirectFlow";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { language } = useAppLanguage();

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await resolveSessionFromAuthUrl();
      } catch (error) {
        logTechnicalAuthError("callback", error);
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !session?.user) {
        if (error) {
          logTechnicalAuthError("callback", error);
          const friendly = toFriendlyAuthError("callback", language, error.message);
          toast.error(friendly.title, { description: friendly.description });
        }
        navigate("/auth/login", { replace: true });
        return;
      }

      localStorage.setItem(ONBOARDING_FLAG_KEY, "true");

      if (!isEmailVerifiedUser(session.user)) {
        navigate("/auth/verify", { replace: true });
        return;
      }

      localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError || !isProfileRecordComplete((profileData as Record<string, unknown> | null) ?? null)) {
        if (profileError) {
          console.error("[auth:callback:profile]", profileError);
        }
        navigate("/auth/profile-setup", { replace: true });
        return;
      }

      const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
      if (redirectPath && !redirectPath.startsWith("/auth")) {
        localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        navigate(redirectPath, { replace: true });
        return;
      }

      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      navigate("/", { replace: true });
    };

    void run();

    return () => {
      active = false;
    };
  }, [language, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-foreground">Validation en cours...</p>
        <p className="mt-1 text-xs text-muted-foreground">جاري التحقق...</p>
      </div>
    </div>
  );
}
