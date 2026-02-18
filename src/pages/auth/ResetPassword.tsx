import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveSessionFromAuthUrl } from "@/lib/authRedirectFlow";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { language, t } = useAppLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const canSubmit = useMemo(
    () => password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword,
    [confirmPassword, password]
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await resolveSessionFromAuthUrl();
      } catch (error) {
        logTechnicalAuthError("reset", error);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      setSessionReady(Boolean(session?.user));
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(language === "ar" ? "تحقق من كلمة المرور" : "Vérifiez le mot de passe", {
        description:
          language === "ar"
            ? "كلمتا المرور غير متطابقتين أو قصيرتان جداً."
            : "Les mots de passe ne correspondent pas ou sont trop courts.",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      logTechnicalAuthError("reset", error);
      const friendly = toFriendlyAuthError("reset", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setLoading(false);
      return;
    }

    toast.success(t("auth.reset.success"));
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate("/auth/login")} className="mb-5 -ml-2 p-2 text-foreground" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="md" className="h-14" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("auth.reset.title")}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {!sessionReady ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("auth.reset.invalid_session")}</p>
              <Button className="w-full" onClick={() => navigate("/auth/login", { replace: true })}>
                {language === "ar" ? "العودة لتسجيل الدخول" : "Retour à la connexion"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{language === "ar" ? "كلمة المرور الجديدة" : "Nouveau mot de passe"}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    className="h-11 rounded-xl pl-10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">{language === "ar" ? "تأكيد كلمة المرور" : "Confirmer le mot de passe"}</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  className="h-11 rounded-xl"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <Button onClick={handleSubmit} disabled={!canSubmit || loading} className="h-11 w-full rounded-xl">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "ar" ? "جاري التحديث..." : "Mise à jour..."}
                  </span>
                ) : language === "ar" ? (
                  "تحديث كلمة المرور"
                ) : (
                  "Mettre à jour"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
