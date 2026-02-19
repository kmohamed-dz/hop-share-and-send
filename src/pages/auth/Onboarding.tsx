import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, School, UserRound } from "lucide-react";

import { ONBOARDING_FLAG_KEY } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileByAuthUserId } from "@/lib/profile";
import { toast } from "sonner";

type SchoolRole = "school_admin" | "teacher" | "student" | "parent";
type Mode = "create" | "join";

const ROLE_OPTIONS: Array<{ label: string; value: SchoolRole }> = [
  { label: "School Admin", value: "school_admin" },
  { label: "Teacher", value: "teacher" },
  { label: "Student", value: "student" },
  { label: "Parent", value: "parent" },
];

function normalizeRole(value: unknown): SchoolRole {
  if (
    value === "school_admin" ||
    value === "teacher" ||
    value === "student" ||
    value === "parent"
  ) {
    return value;
  }
  return "school_admin";
}

function normalizeSchoolCode(value: string): string {
  return value.trim().toUpperCase();
}

export default function Onboarding() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SchoolRole>("school_admin");
  const [mode, setMode] = useState<Mode>("create");

  const [schoolName, setSchoolName] = useState("");
  const [schoolWilaya, setSchoolWilaya] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolCode, setSchoolCode] = useState("");

  const normalizedSchoolCode = useMemo(
    () => normalizeSchoolCode(schoolCode),
    [schoolCode]
  );

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

      if (profile) {
        const profileSchoolId =
          typeof profile.school_id === "string" ? profile.school_id : "";
        if (profileSchoolId.trim()) {
          navigate("/dashboard", { replace: true });
          return;
        }

        if (typeof profile.full_name === "string") {
          setFullName(profile.full_name);
        }
        if (typeof profile.phone === "string") {
          setPhone(profile.phone);
        }
        setRole(normalizeRole(profile.role));
      } else {
        const metadata = session.user.user_metadata as Record<string, unknown>;
        if (typeof metadata.full_name === "string") {
          setFullName(metadata.full_name);
        }
        if (typeof metadata.phone === "string") {
          setPhone(metadata.phone);
        }
        setRole(normalizeRole(metadata.role));
      }

      setLoading(false);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (role !== "school_admin" && mode !== "join") {
      setMode("join");
    }
  }, [mode, role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim()) {
      toast.error("Nom complet requis", {
        description: "Veuillez saisir votre nom complet.",
        id: "auth-onboarding-name",
      });
      return;
    }

    if (!normalizedSchoolCode) {
      toast.error("Code école requis", {
        description: "Veuillez fournir un code école.",
        id: "auth-onboarding-code",
      });
      return;
    }

    if (mode === "create" && !schoolName.trim()) {
      toast.error("Nom de l'école requis", {
        description: "Veuillez saisir le nom de votre école.",
        id: "auth-onboarding-school-name",
      });
      return;
    }

    if (mode === "create" && !schoolWilaya.trim()) {
      toast.error("Wilaya requise", {
        description: "Veuillez saisir la wilaya de votre école.",
        id: "auth-onboarding-school-wilaya",
      });
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error("Session invalide", {
        description: "Reconnectez-vous puis recommencez.",
        id: "auth-onboarding-user",
      });
      setSubmitting(false);
      navigate("/login", { replace: true });
      return;
    }

    let resolvedSchoolId: string | null = null;

    if (mode === "create") {
      const { data: createdSchool, error: schoolInsertError } = await supabase
        .from("schools")
        .insert({
          address: schoolAddress.trim() || null,
          name: schoolName.trim(),
          school_code: normalizedSchoolCode,
          wilaya: schoolWilaya.trim(),
        } as never)
        .select("id")
        .single();

      if (schoolInsertError || !createdSchool?.id) {
        toast.error("Création de l'école impossible", {
          description:
            schoolInsertError?.message ??
            "Vérifiez le code école et réessayez.",
          id: "auth-onboarding-create-school",
        });
        setSubmitting(false);
        return;
      }

      resolvedSchoolId = createdSchool.id as string;
    } else {
      const { data: resolvedByCode, error: schoolLookupError } = await supabase
        .rpc("resolve_school_id_by_code" as never, {
          p_school_code: normalizedSchoolCode,
        } as never);

      if (schoolLookupError || !resolvedByCode) {
        toast.error("École introuvable", {
          description:
            schoolLookupError?.message ??
            "Le code école fourni est invalide.",
          id: "auth-onboarding-join-school",
        });
        setSubmitting(false);
        return;
      }

      resolvedSchoolId = resolvedByCode as string;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        full_name: fullName.trim(),
        id: user.id,
        phone: phone.trim() || null,
        role,
        school_id: resolvedSchoolId,
      } as never,
      { onConflict: "id" }
    );

    if (profileError) {
      toast.error("Profil incomplet", {
        description: profileError.message,
        id: "auth-onboarding-profile",
      });
      setSubmitting(false);
      return;
    }

    localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    toast.success("Onboarding terminé", {
      description: "Redirection vers le tableau de bord.",
      id: "auth-onboarding-success",
    });
    setSubmitting(false);
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Préparation de votre espace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5] px-6 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Configuration initiale
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complétez votre profil pour accéder au tableau de bord.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-full-name">Nom complet</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="onboarding-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-11 rounded-xl pl-10"
                  placeholder="Votre nom complet"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-phone">Téléphone (optionnel)</Label>
              <Input
                id="onboarding-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex: 0550 00 00 00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-role">Rôle</Label>
              <select
                id="onboarding-role"
                value={role}
                onChange={(event) => setRole(event.target.value as SchoolRole)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Mode d'onboarding</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={mode === "create" ? "default" : "outline"}
                  disabled={role !== "school_admin"}
                  onClick={() => setMode("create")}
                  className="h-11 rounded-xl"
                >
                  Créer une école
                </Button>
                <Button
                  type="button"
                  variant={mode === "join" ? "default" : "outline"}
                  onClick={() => setMode("join")}
                  className="h-11 rounded-xl"
                >
                  Rejoindre une école
                </Button>
              </div>
            </div>

            {mode === "create" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-school-name">Nom de l'école</Label>
                  <div className="relative">
                    <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="onboarding-school-name"
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      className="h-11 rounded-xl pl-10"
                      placeholder="École أبشر"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-school-wilaya">Wilaya</Label>
                  <Input
                    id="onboarding-school-wilaya"
                    value={schoolWilaya}
                    onChange={(event) => setSchoolWilaya(event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="Ex: Alger"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-school-address">
                    Adresse (optionnel)
                  </Label>
                  <Input
                    id="onboarding-school-address"
                    value={schoolAddress}
                    onChange={(event) => setSchoolAddress(event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="Adresse de l'école"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="onboarding-school-code">Code école</Label>
              <Input
                id="onboarding-school-code"
                value={schoolCode}
                onChange={(event) => setSchoolCode(event.target.value)}
                className="h-11 rounded-xl"
                placeholder="Ex: ABSHER-001"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-6 h-11 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </span>
            ) : (
              "Continuer vers le tableau de bord"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
