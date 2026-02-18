import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogOut, MailCheck, RefreshCw } from "lucide-react";

import { PENDING_VERIFICATION_EMAIL_KEY } from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { getHashRouteUrl } from "@/lib/publicUrl";
import { toast } from "sonner";

function getEmailRedirectTo(): string {
  return getHashRouteUrl("/auth/callback");
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useAppLanguage();

  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const pendingEmail = localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) ?? "";
      const stateEmail = (location.state as { email?: string } | null)?.email?.trim().toLowerCase() ?? "";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
      const resolvedEmail = sessionEmail || stateEmail || pendingEmail;
      setEmail(resolvedEmail);

      if (sessionEmail && session?.user?.email_confirmed_at) {
        localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
        navigate("/", { replace: true });
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [location.state, navigate]);

  const handleResend = async () => {
    if (!normalizedEmail) {
      toast.error("Adresse e-mail requise", {
        description: "Entrez votre e-mail pour recevoir un nouveau lien de vérification.",
      });
      return;
    }

    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    if (error) {
      logTechnicalAuthError("verify", error);
      const friendly = toFriendlyAuthError("verify", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setResending(false);
      return;
    }

    localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);
    toast.success("E-mail de vérification renvoyé", {
      description: "Vérifiez votre boîte de réception (et spam).",
    });
    setResending(false);
  };

  const handleCheck = async () => {
    setChecking(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logTechnicalAuthError("verify", error);
      const friendly = toFriendlyAuthError("verify", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setChecking(false);
      return;
    }

    if (user?.email && user.email_confirmed_at) {
      localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
      toast.success("E-mail vérifié");
      navigate("/", { replace: true });
      setChecking(false);
      return;
    }

    toast("Vérification en attente", {
      description: "Confirmez votre e-mail puis reconnectez-vous si nécessaire.",
    });
    setChecking(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="md" className="h-14" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <MailCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vérifiez votre e-mail</h1>
              <p className="text-xs text-muted-foreground">تحقق من بريدك الإلكتروني</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            FR: Email de confirmation envoyé. Vérifiez votre boîte de réception et vos spams.
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            AR: تم إرسال رسالة التأكيد. تحقق من البريد الوارد والرسائل غير المرغوب فيها.
          </p>

          <div className="space-y-2">
            <label htmlFor="verify-email" className="text-sm font-semibold text-foreground">
              Adresse e-mail
            </label>
            <Input
              id="verify-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="exemple@email.com"
              autoComplete="email"
            />
          </div>

          <div className="mt-5 space-y-2">
            <Button onClick={handleCheck} disabled={checking} className="w-full h-11 rounded-xl">
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification...
                </span>
              ) : (
                "J'ai vérifié mon e-mail"
              )}
            </Button>

            <Button
              onClick={handleResend}
              disabled={resending || !normalizedEmail}
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              {resending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Renvoyer le mail
                </span>
              )}
            </Button>

            <Button onClick={handleSignOut} variant="ghost" className="w-full h-11 rounded-xl text-muted-foreground">
              <span className="flex items-center justify-center gap-2">
                <LogOut className="h-4 w-4" />
                Retour à la connexion
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
