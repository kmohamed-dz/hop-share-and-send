import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import {
  ONBOARDING_ROLE_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
} from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { getHashRouteUrl } from "@/lib/publicUrl";
import { toast } from "sonner";

type LoginLocationState = {
  role?: "traveler" | "owner" | "both";
};

function getPasswordResetRedirectTo(): string {
  return getHashRouteUrl("/auth/reset-password");
}

function isUnverifiedEmailError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("email not confirmed") || normalized.includes("email not verified");
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useAppLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const role = (location.state as LoginLocationState | null)?.role;

  useEffect(() => {
    if (role) {
      localStorage.setItem(ONBOARDING_ROLE_KEY, role);
    }
  }, [role]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleLogin = async () => {
    if (!normalizedEmail || !password) {
      toast.error("Champs requis", {
        description: "E-mail et mot de passe sont obligatoires.",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      logTechnicalAuthError("login", error);
      if (isUnverifiedEmailError(error.message)) {
        localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);
        toast.error("E-mail non vérifié", {
          description: "Vérifiez votre boîte mail avant de continuer.",
        });
        navigate("/auth/verify", { replace: true });
        setLoading(false);
        return;
      }

      const friendly = toFriendlyAuthError("login", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setLoading(false);
      return;
    }

    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
    toast.success("Connexion réussie");
    navigate("/", { replace: true });
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!normalizedEmail) {
      toast.error("Adresse e-mail requise", {
        description: "Entrez votre e-mail pour recevoir le lien de réinitialisation.",
      });
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });

    if (error) {
      logTechnicalAuthError("reset", error);
      const friendly = toFriendlyAuthError("reset", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setResetLoading(false);
      return;
    }

    toast.success("E-mail envoyé", {
      description: "Un lien de réinitialisation vous a été envoyé.",
    });
    setResetLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-5 -ml-2 p-2 text-foreground" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="md" className="h-14" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Se connecter</h1>
          <p className="mt-1 text-sm text-muted-foreground">الدخول</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
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

            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading || !normalizedEmail || !password}
            className="mt-6 h-11 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion...
              </span>
            ) : (
              "Se connecter"
            )}
          </Button>

          <button
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="mt-4 w-full text-center text-sm font-medium text-primary disabled:opacity-60"
          >
            {resetLoading ? "Envoi..." : "Mot de passe oublié"}
          </button>

          <button
            onClick={() => navigate("/auth/signup", { state: { role } })}
            className="mt-3 w-full text-center text-sm font-medium text-muted-foreground"
          >
            Pas de compte ? Créer un compte
          </button>
        </div>
      </div>
    </div>
  );
}
