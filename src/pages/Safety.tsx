import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Safety() {
  const navigate = useNavigate();
  const [targetUserId, setTargetUserId] = useState("");
  const [dealId, setDealId] = useState("");
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
        <h1 className="maak-section-title">Sécurité</h1>
      </div>

      <Card className="maak-card p-4"><p className="font-semibold">Vérification d’identité</p><p className="text-sm text-muted-foreground">Statut: à venir.</p></Card>
      <Card className="maak-card p-4"><p className="font-semibold">Déclaration du colis</p><p className="text-sm text-muted-foreground">Le contenu, dimensions et valeur sont requis avant publication.</p></Card>
      <Card className="maak-card p-4"><p className="font-semibold">Confidentialité progressive</p><p className="text-sm text-muted-foreground">Le contact n’est visible qu’après acceptation des deux parties.</p></Card>
      <Card className="maak-card p-4"><p className="font-semibold">Score de réputation</p><Button variant="outline" className="mt-2" onClick={() => navigate('/profile/ratings')}>Voir les avis</Button></Card>

      <Card className="maak-card p-4 space-y-2">
        <p className="font-semibold">Signalement & escalade</p>
        <Input placeholder="ID utilisateur ciblé" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
        <Input placeholder="ID deal (optionnel)" value={dealId} onChange={(e) => setDealId(e.target.value)} />
        <Input placeholder="Motif" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Textarea placeholder="Détails" value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button className="w-full" onClick={submitReport}><ShieldCheck className="h-4 w-4 mr-2" />Envoyer le signalement</Button>
      </Card>
    </div>
  );
}
