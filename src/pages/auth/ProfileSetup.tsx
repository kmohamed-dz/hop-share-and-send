import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Loader2, User } from "lucide-react";

import { ONBOARDING_ROLE_KEY } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { isProfileRecordComplete } from "@/lib/authState";
import { fetchProfileByAuthUserId } from "@/lib/profile";
import { toast } from "sonner";

type MaakRole = "traveler" | "owner" | "both";
type ProfileSetupLocationState = {
  role?: MaakRole;
};

function normalizeRole(value: string | null | undefined): MaakRole {
  if (value === "traveler" || value === "owner" || value === "both") {
    return value;
  }
  return "both";
}

function toProfileRole(value: MaakRole): "sender" | "traveler" {
  return value === "traveler" ? "traveler" : "sender";
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const roleFromLocation = (location.state as ProfileSetupLocationState | null)?.role;
  const role = useMemo(
    () => normalizeRole(roleFromLocation ?? localStorage.getItem(ONBOARDING_ROLE_KEY)),
    [roleFromLocation]
  );

  useEffect(() => {
    localStorage.setItem(ONBOARDING_ROLE_KEY, role);
  }, [role]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (!session?.user) {
        navigate("/login", { replace: true });
        return;
      }

      const profile = await fetchProfileByAuthUserId(session.user.id);
      if (!active) {
        return;
      }

      if (isProfileRecordComplete(profile)) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const resolvedName =
        typeof profile?.full_name === "string"
          ? profile.full_name
          : typeof profile?.name === "string"
            ? profile.name
            : typeof session.user.user_metadata?.full_name === "string"
              ? session.user.user_metadata.full_name
              : typeof session.user.user_metadata?.name === "string"
                ? session.user.user_metadata.name
                : "";
      setName(resolvedName);
      setBootstrapping(false);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error("Nom requis", {
        description: "Veuillez saisir votre nom complet.",
        id: "auth-profile-setup-name",
      });
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session invalide", {
        description: "Reconnectez-vous puis réessayez.",
        id: "auth-profile-setup-session",
      });
      setLoading(false);
      navigate("/login", { replace: true });
      return;
    }

    const legacyPayload = {
      full_name: normalizedName,
      name: normalizedName,
      phone: user.phone ?? "",
      profile_complete: true,
      role_preference: role,
      user_id: user.id,
    };

    const modernPayload = {
      email: user.email ?? null,
      full_name: normalizedName,
      id: user.id,
      is_active: true,
      phone: user.phone ?? null,
      role: toProfileRole(role),
    };

    const legacyWrite = await supabase
      .from("profiles")
      .upsert(legacyPayload as never, { onConflict: "user_id" });

    let writeError = legacyWrite.error ?? null;
    if (writeError) {
      const modernWrite = await supabase
        .from("profiles")
        .upsert(modernPayload as never, { onConflict: "id" });
      writeError = modernWrite.error ?? null;
    }

    if (writeError) {
      toast.error("Échec de la création du profil", {
        description: writeError.message,
        id: "auth-profile-setup-write",
      });
      setLoading(false);
      return;
    }

    localStorage.removeItem(ONBOARDING_ROLE_KEY);
    toast.success("Profil enregistré", { id: "auth-profile-setup-success" });
    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Préparation du profil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        <div className="pb-6">
          <h1 className="text-2xl font-bold mb-2">Créez votre profil</h1>
          <p className="text-muted-foreground">Dites-nous comment vous appeler.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-name">Nom complet</Label>
              <Input
                id="profile-name"
                placeholder="Votre nom"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="h-11 w-full rounded-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                "Terminer"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
