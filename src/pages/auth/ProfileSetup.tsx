import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";

import {
  ONBOARDING_FLAG_KEY,
  ONBOARDING_ROLE_KEY,
  PENDING_VERIFICATION_EMAIL_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
} from "@/components/auth/AuthGate";
import { WilayaSelect } from "@/components/WilayaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { isValidWilayaName } from "@/lib/wilaya";
import { toast } from "sonner";

type ProfileSetupLocationState = {
  role?: "traveler" | "owner" | "both";
};

function normalizeRole(value: string | null | undefined): "traveler" | "owner" | "both" {
  if (value === "traveler" || value === "owner" || value === "both") {
    return value;
  }

  return "both";
}

export default function ProfileSetup() {
  const [fullName, setFullName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const roleFromState = (location.state as ProfileSetupLocationState | null)?.role;
  const role = useMemo(
    () => normalizeRole(roleFromState ?? localStorage.getItem(ONBOARDING_ROLE_KEY)),
    [roleFromState]
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        navigate("/auth/login", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active || error || !data) return;

      const rawFullName =
        typeof (data as Record<string, unknown>).full_name === "string"
          ? ((data as Record<string, unknown>).full_name as string)
          : typeof (data as Record<string, unknown>).name === "string"
            ? ((data as Record<string, unknown>).name as string)
            : "";

      const rawWilaya =
        typeof (data as Record<string, unknown>).wilaya === "string"
          ? ((data as Record<string, unknown>).wilaya as string)
          : "";

      const rawNationalId =
        typeof (data as Record<string, unknown>).national_id === "string"
          ? ((data as Record<string, unknown>).national_id as string)
          : "";

      setFullName(rawFullName);
      setWilaya(rawWilaya);
      setNationalId(rawNationalId);
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [navigate]);

  const isFormValid = Boolean(fullName.trim() && wilaya.trim() && nationalId.trim());

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Champs requis manquants", {
        description: "Nom complet, wilaya et identifiant national sont obligatoires.",
      });
      return;
    }

    if (!isValidWilayaName(wilaya)) {
      toast.error("Wilaya invalide", {
        description: "Sélectionnez une wilaya officielle.",
      });
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error("Erreur d'authentification");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      full_name: fullName.trim(),
      name: fullName.trim(),
      wilaya: wilaya.trim(),
      national_id: nationalId.trim(),
      role_preference: role,
      phone: user.phone || "",
      language_preference: language,
      preferred_language: language,
      profile_complete: true,
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    if (error) {
      toast.error("Erreur de profil", { description: error.message });
      setLoading(false);
      return;
    }

    localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    localStorage.removeItem(ONBOARDING_ROLE_KEY);
    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);

    toast.success("Profil enregistré");

    const redirectPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
    if (redirectPath) {
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      navigate(redirectPath, { replace: true });
      setLoading(false);
      return;
    }

    navigate("/", { replace: true });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 safe-top safe-bottom">
      <div className="pt-10 pb-6">
        <h1 className="mb-2 text-2xl font-bold">Configuration du profil</h1>
        <p className="text-muted-foreground">Complétez les informations obligatoires avant d'accéder à l'application.</p>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <User className="h-9 w-9 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="full-name" className="text-base">
            Nom complet
          </Label>
          <Input
            id="full-name"
            placeholder="Votre nom complet"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 rounded-xl text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base">Wilaya</Label>
          <WilayaSelect value={wilaya} onValueChange={setWilaya} placeholder="Sélectionner votre wilaya" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="national-id" className="text-base">
            Identifiant national
          </Label>
          <Input
            id="national-id"
            placeholder="NIN ou numéro national"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            className="h-12 rounded-xl text-base"
          />
        </div>
      </div>

      <div className="pb-8 pt-6">
        <Button onClick={handleSubmit} disabled={loading || !isFormValid} className="h-12 w-full rounded-xl text-base font-semibold">
          {loading ? "Chargement..." : "Terminer"}
        </Button>
      </div>
    </div>
  );
}
