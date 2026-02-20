import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, UserRound } from "lucide-react";

import {
  ONBOARDING_ROLE_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
} from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { getHashRouteUrl } from "@/lib/publicUrl";
import { toast } from "sonner";

type SignupLocationState = {
  role?: "traveler" | "owner" | "both";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailRedirectTo(): string {
  return getHashRouteUrl("/auth/callback");
}

function normalizeRole(
  value: string | null | undefined
): "traveler" | "owner" | "both" | null {
  if (value === "traveler" || value === "owner" || value === "both") {
    return value;
  }
  return null;
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useAppLanguage();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const roleFromLocation = (location.state as SignupLocationState | null)?.role;
  const role = normalizeRole(roleFromLocation ?? localStorage.getItem(ONBOARDING_ROLE_KEY));
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (role) {
      localStorage.setItem(ONBOARDING_ROLE_KEY, role);
    }
  }, [role]);

  const isFormValid =
    Boolean(normalizedEmail && fullName.trim()) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("Nom complet requis", {
        description: "Veuillez saisir votre nom complet.",
        id: "auth-signup-name",
      });
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.error("Email invalide", {
        description: "Veuillez saisir une adresse email valide.",
        id: "auth-signup-email",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Mot de passe insuffisant", {
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        id: "auth-signup-password",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mots de passe différents", {
        description: "Le mot de passe et sa confirmation doivent correspondre.",
        id: "auth-signup-confirm",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        },
      },
    });

    if (error) {
      logTechnicalAuthError("signup", error);
      const friendly = toFriendlyAuthError("signup", language, error.message);
      toast.error(friendly.title, {
        description: friendly.description,
        id: "auth-signup-error",
      });
      setLoading(false);
      return;
    }

    localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);

    if (data.session) {
      toast.success("Compte créé", {
        description: "Votre compte est prêt.",
        id: "auth-signup-success-direct",
      });
      navigate("/auth/profile-setup", { replace: true, state: { role: role ?? "both" } });
      setLoading(false);
      return;
    }

    toast.success("Email de confirmation envoyé", {
      description:
        "Vérifiez votre boîte de réception pour confirmer votre compte.",
      id: "auth-signup-success-verify",
    });
    navigate("/login", { replace: true });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 -ml-2 p-2 text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="md" className="h-14" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Créer un compte
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">إنشاء حساب جديد</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-full-name">Nom complet *</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Votre nom complet"
                  className="h-11 rounded-xl pl-10"
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone">Téléphone (optionnel)</Label>
              <Input
                id="signup-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ex: 0550 00 00 00"
                className="h-11 rounded-xl"
                type="tel"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail *</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  className="h-11 rounded-xl pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Mot de passe *</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 caractères"
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password-confirm">
                Confirmer le mot de passe *
              </Label>
              <Input
                id="signup-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Répétez le mot de passe"
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className="mt-6 h-11 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Création...
              </span>
            ) : (
              "Créer le compte"
            )}
          </Button>

          <button
            onClick={() => navigate("/login", { state: { role } })}
            className="mt-4 w-full text-center text-sm font-medium text-muted-foreground"
          >
            Déjà un compte ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
