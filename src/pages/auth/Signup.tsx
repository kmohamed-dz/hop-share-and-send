import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, Mail, UserRound } from "lucide-react";

import {
  ONBOARDING_ROLE_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
} from "@/components/auth/AuthGate";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { WilayaSelect } from "@/components/WilayaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { findWilayaByStoredName } from "@/data/wilayas";
import { supabase } from "@/integrations/supabase/client";
import { logTechnicalAuthError, toFriendlyAuthError } from "@/lib/authErrors";
import { getHashUrl, getPublicUrl } from "@/lib/publicUrl";
import { isValidWilayaName } from "@/lib/wilaya";
import { toast } from "sonner";

type SignupLocationState = {
  role?: "traveler" | "owner" | "both";
};

type SignupDebugState = {
  emailRedirectTo: string;
  errorCode: string | null;
  errorMessage: string | null;
  profileError: string | null;
  profileWrite: "not_attempted" | "success" | "failed" | "skipped";
  signUpStatus: "idle" | "success" | "failed";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPECTED_PUBLIC_URL = "https://kmohamed-dz.github.io/hop-share-and-send";

function normalizeRole(value: string | null | undefined): "traveler" | "owner" | "both" {
  if (value === "traveler" || value === "owner" || value === "both") {
    return value;
  }

  return "both";
}

function isPublicUrlConfiguredCorrectly(value: string): boolean {
  const normalized = value.trim().replace(/\/+$/, "");
  return normalized === EXPECTED_PUBLIC_URL;
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useAppLanguage();

  const [fullName, setFullName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugState, setDebugState] = useState<SignupDebugState>(() => ({
    signUpStatus: "idle",
    profileWrite: "not_attempted",
    errorCode: null,
    errorMessage: null,
    profileError: null,
    emailRedirectTo: getHashUrl("/auth/callback"),
  }));

  const roleFromLocation = (location.state as SignupLocationState | null)?.role;
  const role = normalizeRole(roleFromLocation ?? localStorage.getItem(ONBOARDING_ROLE_KEY));

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const publicUrl = useMemo(() => getPublicUrl(), []);
  const emailRedirectTo = useMemo(() => getHashUrl("/auth/callback"), []);
  const envPublicUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim() ?? "";
  const showDomainWarning = !envPublicUrl || !isPublicUrlConfiguredCorrectly(envPublicUrl);

  const isFormValid =
    Boolean(normalizedEmail && fullName.trim() && wilaya.trim() && nationalId.trim()) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  const isDebugVisible = import.meta.env.DEV || showDebug;

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("Nom complet requis", { description: "Veuillez saisir votre nom complet." });
      return;
    }

    if (!isValidWilayaName(wilaya)) {
      toast.error("Wilaya invalide", {
        description: "Sélectionnez une wilaya officielle dans la liste.",
      });
      return;
    }

    if (!nationalId.trim()) {
      toast.error("Identifiant national requis", {
        description: "Veuillez saisir votre numéro de référence nationale.",
      });
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.error("Email invalide", {
        description: "Veuillez saisir une adresse email valide.",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Mot de passe insuffisant", {
        description: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mots de passe différents", {
        description: "Le mot de passe et sa confirmation doivent correspondre.",
      });
      return;
    }

    const wilayaEntry = findWilayaByStoredName(wilaya);
    if (!wilayaEntry) {
      toast.error("Wilaya invalide", {
        description: "Impossible de résoudre le code de la wilaya sélectionnée.",
      });
      return;
    }

    setLoading(true);
    setDebugState({
      signUpStatus: "idle",
      profileWrite: "not_attempted",
      errorCode: null,
      errorMessage: null,
      profileError: null,
      emailRedirectTo,
    });

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          wilaya: wilayaEntry.name_fr,
          wilaya_code: wilayaEntry.code,
          wilaya_name: wilayaEntry.name_fr,
          national_id: nationalId.trim(),
          phone: phone.trim() || "",
          role_preference: role,
          profile_complete: false,
          language_preference: "fr",
          preferred_language: "fr",
        },
      },
    });

    if (error) {
      logTechnicalAuthError("signup", error);
      const friendly = toFriendlyAuthError("signup", language, error.message);
      toast.error(friendly.title, { description: friendly.description });
      setDebugState({
        signUpStatus: "failed",
        profileWrite: "not_attempted",
        errorCode: (error as { code?: string }).code ?? null,
        errorMessage: error.message,
        profileError: null,
        emailRedirectTo,
      });
      setLoading(false);
      return;
    }

    let profileWrite: SignupDebugState["profileWrite"] = "skipped";
    let profileErrorMessage: string | null = null;

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        user_id: data.user.id,
        full_name: fullName.trim(),
        name: fullName.trim(),
        wilaya: wilayaEntry.name_fr,
        wilaya_code: wilayaEntry.code,
        wilaya_name: wilayaEntry.name_fr,
        national_id: nationalId.trim(),
        phone: phone.trim() || "",
        language_preference: "fr",
        preferred_language: "fr",
        profile_complete: false,
      } as never);

      if (profileError) {
        profileWrite = "failed";
        profileErrorMessage = profileError.message;
        logTechnicalAuthError("signup", profileError);
        toast.error("Compte créé mais profil incomplet", {
          description:
            "Le compte est créé, mais les données de profil n'ont pas été enregistrées complètement. Continuez la vérification email puis complétez votre profil.",
        });
      } else {
        profileWrite = "success";
      }
    }

    localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);

    toast.success("Email de confirmation envoyé", {
      description:
        "FR: Email de confirmation envoyé. Vérifiez votre boîte de réception et vos spams.\nAR: تم إرسال رسالة التأكيد. تحقق من البريد الوارد والرسائل غير المرغوب فيها.",
    });

    setDebugState({
      signUpStatus: "success",
      profileWrite,
      errorCode: null,
      errorMessage: null,
      profileError: profileErrorMessage,
      emailRedirectTo,
    });

    navigate("/auth/verify", { replace: true, state: { email: normalizedEmail } });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-5 -ml-2 p-2 text-foreground" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="md" className="h-14" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">إنشاء حساب جديد</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {showDomainWarning && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Configuration du domaine manquante: vérifiez VITE_PUBLIC_APP_URL</p>
                  <p className="text-xs">Public URL détectée: {publicUrl}</p>
                </div>
              </div>
            </div>
          )}

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
              <Label>Wilaya *</Label>
              <WilayaSelect value={wilaya} onValueChange={setWilaya} placeholder="Sélectionner une wilaya" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-national-id">Identifiant national *</Label>
              <Input
                id="signup-national-id"
                value={nationalId}
                onChange={(event) => setNationalId(event.target.value)}
                placeholder="NIN / numéro national"
                className="h-11 rounded-xl"
              />
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
              <Label htmlFor="signup-password-confirm">Confirmer le mot de passe *</Label>
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
                {language === "ar" ? "جارٍ إنشاء الحساب..." : "Création du compte..."}
              </span>
            ) : (
              "Créer mon compte"
            )}
          </Button>

          {!import.meta.env.DEV && (
            <button
              onClick={() => setShowDebug((value) => !value)}
              className="mt-3 w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              {showDebug ? "Masquer détails" : "Afficher détails"}
            </button>
          )}

          {isDebugVisible && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">SignUp:</span> {debugState.signUpStatus}
              </p>
              <p>
                <span className="font-semibold text-foreground">emailRedirectTo:</span> {debugState.emailRedirectTo}
              </p>
              <p>
                <span className="font-semibold text-foreground">profile_write:</span> {debugState.profileWrite}
              </p>
              <p>
                <span className="font-semibold text-foreground">error_code:</span> {debugState.errorCode ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-foreground">error_message:</span> {debugState.errorMessage ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-foreground">profile_error:</span> {debugState.profileError ?? "-"}
              </p>
            </div>
          )}

          <button
            onClick={() => navigate("/auth/login", { replace: true })}
            className="mt-4 w-full text-center text-sm font-medium text-primary"
          >
            Déjà inscrit ? Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
