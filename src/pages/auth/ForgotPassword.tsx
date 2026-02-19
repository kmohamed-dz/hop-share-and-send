import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { getHashRouteUrl } from "@/lib/publicUrl";
import { toast } from "sonner";

type ForgotPasswordLocationState = {
  email?: string;
};

function getPasswordResetRedirectTo(): string {
  return getHashRouteUrl("/update-password");
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useAppLanguage();

  const defaultEmail =
    (location.state as ForgotPasswordLocationState | null)?.email ?? "";

  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSendResetLink = async () => {
    if (!normalizedEmail) {
      toast.error("Adresse e-mail requise", {
        description: "Entrez votre e-mail pour recevoir le lien de réinitialisation.",
        id: "auth-forgot-required",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });

    if (error) {
      logTechnicalAuthError("reset", error);
      const friendly = toFriendlyAuthError("reset", language, error.message);
      toast.error(friendly.title, {
        description: friendly.description,
        id: "auth-forgot-error",
      });
      setLoading(false);
      return;
    }

    toast.success("E-mail envoyé", {
      description: "Un lien de réinitialisation vous a été envoyé.",
      id: "auth-forgot-success",
    });
    setLoading(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={() => navigate("/login")}
          className="mb-5 -ml-2 p-2 text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="md" className="h-14" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Récupération du compte
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-xl pl-10"
                autoFocus
              />
            </div>
          </div>

          <Button
            onClick={handleSendResetLink}
            disabled={loading || !normalizedEmail}
            className="mt-6 h-11 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi...
              </span>
            ) : (
              "Envoyer le lien"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
