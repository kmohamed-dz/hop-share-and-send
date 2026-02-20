import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  ONBOARDING_FLAG_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
} from "@/components/auth/AuthGate";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { isProfileRecordComplete } from "@/lib/authState";
import { resolveSessionFromAuthUrl } from "@/lib/authRedirectFlow";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { fetchProfileByAuthUserId } from "@/lib/profile";
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
          toast.error(friendly.title, {
            description: friendly.description,
            id: "auth-callback-error",
          });
        }
        navigate("/login", { replace: true });
        return;
      }

      localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
      const profileData = await fetchProfileByAuthUserId(session.user.id);

      if (!active) return;

      if (!isProfileRecordComplete(profileData)) {
        navigate("/auth/profile-setup", { replace: true });
        return;
      }

      const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
      if (redirectPath) {
        localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        navigate(redirectPath, { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
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
