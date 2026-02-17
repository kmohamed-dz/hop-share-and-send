import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert, ShieldCheck, Siren, UserCheck, PackageSearch, LockKeyhole, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const layers = [
  {
    icon: UserCheck,
    title: "Vérification d’identité",
    why: "Limiter les comptes anonymes et renforcer la confiance de base.",
    status: "MVP",
  },
  {
    icon: PackageSearch,
    title: "Déclaration du colis",
    why: "Décrire contenu, dimensions et valeur estimée avant tout transfert.",
    status: "MVP",
  },
  {
    icon: LockKeyhole,
    title: "Divulgation progressive",
    why: "Le contact direct reste caché avant acceptation mutuelle.",
    status: "À venir",
  },
  {
    icon: Star,
    title: "Score de réputation",
    why: "S’appuyer sur l’historique réel des transactions confirmées.",
    status: "À venir",
  },
  {
    icon: Siren,
    title: "Signalement & escalade",
    why: "Permettre un recours rapide en cas d’incident.",
    status: "MVP",
  },
];

export default function Safety() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [targetUserId, setTargetUserId] = useState(searchParams.get("targetUserId") ?? "");
  const [dealId, setDealId] = useState(searchParams.get("dealId") ?? "");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submitReport = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase.from("reports").insert({
      reporter_user_id: data.user.id,
      target_user_id: targetUserId,
      deal_id: dealId || null,
      reason,
      details: details || null,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Signalement envoyé");
      setReason("");
      setDetails("");
    }
  };

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Sécurité & règles</h1>
      </div>

      {layers.map(({ icon: Icon, title, why, status }) => (
        <Card key={title} className="maak-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">{title}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Statut: {status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Pourquoi c’est important: {why}
          </p>
        </Card>
      ))}

      <Card className="maak-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <p className="font-semibold">Signalement & escalade</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Le signalement est visible par son auteur. Les règles RLS empêchent les autres utilisateurs de consulter vos signalements.
        </p>
        <Input placeholder="ID utilisateur ciblé" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
        <Input placeholder="ID deal (optionnel)" value={dealId} onChange={(e) => setDealId(e.target.value)} />
        <Input placeholder="Motif" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Textarea placeholder="Détails" value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button
          className="w-full"
          onClick={submitReport}
          disabled={!targetUserId.trim() || !reason.trim()}
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          Envoyer le signalement
        </Button>
      </Card>
    </div>
  );
}
