import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type DealExt = Tables<"deals"> & {
  sender_accepted_at?: string | null;
  traveler_accepted_at?: string | null;
  delivery_confirmed_at?: string | null;
  payment_status?: string;
};

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<DealExt | null>(null);
  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [parcel, setParcel] = useState<Tables<"parcel_requests"> | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [travelerPhone, setTravelerPhone] = useState<string>("");
  const [senderCode, setSenderCode] = useState<string>("");
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [contentOk, setContentOk] = useState(false);
  const [sizeOk, setSizeOk] = useState(false);
  const [pickupProof, setPickupProof] = useState<File | null>(null);

  const isMutuallyAccepted = deal?.status === "mutually_accepted" || deal?.status === "picked_up" || deal?.status === "delivered_confirmed";

  const role = useMemo(() => {
    if (!deal || !myUserId) return "unknown";
    if (deal.owner_user_id === myUserId) return "sender";
    if (deal.traveler_user_id === myUserId) return "traveler";
    return "unknown";
  }, [deal, myUserId]);

  const load = async () => {
    if (!dealId) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    setMyUserId(user?.id ?? null);

    const { data: d } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    const dealData = d as DealExt | null;
    setDeal(dealData);

    if (!dealData) return;

    const [tripRes, parcelRes, senderProfileRes, travelerProfileRes] = await Promise.all([
      dealData.trip_id ? supabase.from("trips").select("*").eq("id", dealData.trip_id).maybeSingle() : Promise.resolve({ data: null }),
      dealData.parcel_request_id ? supabase.from("parcel_requests").select("*").eq("id", dealData.parcel_request_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("profiles").select("phone").eq("user_id", dealData.owner_user_id).maybeSingle(),
      supabase.from("profiles").select("phone").eq("user_id", dealData.traveler_user_id).maybeSingle(),
    ]);

    setTrip((tripRes as { data: Tables<"trips"> | null }).data ?? null);
    setParcel((parcelRes as { data: Tables<"parcel_requests"> | null }).data ?? null);
    setSenderPhone((senderProfileRes.data as { phone?: string } | null)?.phone ?? "");
    setTravelerPhone((travelerProfileRes.data as { phone?: string } | null)?.phone ?? "");

    if (user?.id === dealData.owner_user_id) {
      const { data: deliveryCode } = await supabase.from("delivery_codes" as never).select("sender_visible_code").eq("deal_id", dealId).maybeSingle();
      setSenderCode((deliveryCode as { sender_visible_code?: string } | null)?.sender_visible_code ?? "");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const handleAccept = async () => {
    if (!dealId) return;
    const { error } = await supabase.rpc("accept_deal", { p_deal_id: dealId });
    if (error) toast.error(error.message);
    else {
      toast.success("Deal accepté");
      await load();
    }
  };

  const handlePickup = async () => {
    if (!dealId || !pickupProof) {
      toast.error("Ajoutez une photo de preuve");
      return;
    }

    const filePath = `${dealId}/pickup-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("handoff_proofs").upload(filePath, pickupProof, { upsert: false });
    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("handoff_proofs").getPublicUrl(filePath);
    const { data: ok, error } = await supabase.rpc("confirm_pickup", {
      p_deal_id: dealId,
      p_content_ok: contentOk,
      p_size_ok: sizeOk,
      p_photo_url: data.publicUrl,
    });

    if (error || !ok) toast.error(error?.message ?? "Pickup impossible");
    else {
      toast.success("Prise en charge confirmée");
      await load();
    }
  };

  const handleVerifyDeliveryCode = async () => {
    if (!dealId || !deliveryCodeInput.trim()) return;

    const { data, error } = await supabase.rpc("verify_delivery_code", { p_deal_id: dealId, p_code: deliveryCodeInput.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }

    const result = (data as { success: boolean; message: string }[] | null)?.[0];
    if (result?.success) {
      toast.success(result.message);
      await load();
    } else {
      toast.error(result?.message ?? "Code incorrect. Livraison non confirmée.");
    }
  };

  if (!deal) {
    return <div className="mobile-page"><p className="text-sm text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Détail du deal</h1>
      </div>

      <Card className="maak-card p-4 space-y-2">
        <p className="text-sm font-semibold">{trip?.origin_wilaya} → {trip?.destination_wilaya}</p>
        <p className="text-xs text-muted-foreground">Statut: {deal.status}</p>
        <p className="text-xs text-muted-foreground">Colis: {parcel?.category} • {parcel?.size_weight ?? "taille N/A"} • {parcel?.reward_dzd ?? 0} DZD</p>
      </Card>


      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">Timeline du deal</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className={["proposed", "accepted_by_sender", "accepted_by_traveler", "mutually_accepted", "picked_up", "delivered_confirmed"].includes(deal.status) ? "text-foreground" : ""}>• Proposé</li>
          <li className={["accepted_by_sender", "accepted_by_traveler", "mutually_accepted", "picked_up", "delivered_confirmed"].includes(deal.status) ? "text-foreground" : ""}>• Acceptation en cours</li>
          <li className={["mutually_accepted", "picked_up", "delivered_confirmed"].includes(deal.status) ? "text-foreground" : ""}>• Accepté par les deux parties</li>
          <li className={["picked_up", "delivered_confirmed"].includes(deal.status) ? "text-foreground" : ""}>• Pris en charge</li>
          <li className={deal.status === "delivered_confirmed" ? "text-foreground" : ""}>• Livré et confirmé</li>
        </ul>
      </Card>

      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">Confidentialité progressive</p>
        {isMutuallyAccepted ? (
          <div className="space-y-2">
            <p className="text-sm">Contact expéditeur: {senderPhone || "N/A"}</p>
            <p className="text-sm">Contact transporteur: {travelerPhone || "N/A"}</p>
            <Button className="w-full" variant="outline" onClick={() => navigate(`/messages/${deal.id}`)}>
              Ouvrir le chat
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Contact disponible après acceptation des deux parties.</p>
        )}
      </Card>

      {(deal.status === "proposed" || deal.status === "accepted_by_sender" || deal.status === "accepted_by_traveler") && (
        <Button className="w-full maak-primary-btn" onClick={handleAccept}>Accepter</Button>
      )}

      {role === "sender" && isMutuallyAccepted && (
        <Card className="maak-card p-4">
          <p className="text-sm font-semibold">Code secret de livraison</p>
          <p className="text-xs text-muted-foreground">Ne partagez ce code qu’au moment de la remise finale.</p>
          <p className="mt-2 text-lg font-black tracking-wider">{senderCode || "En génération..."}</p>
        </Card>
      )}

      {role === "traveler" && deal.status === "mutually_accepted" && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Confirmer la prise en charge</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contentOk} onChange={(e) => setContentOk(e.target.checked)} /> Contenu conforme</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sizeOk} onChange={(e) => setSizeOk(e.target.checked)} /> Dimensions/poids conformes</label>
          <Input type="file" accept="image/*" onChange={(e) => setPickupProof(e.target.files?.[0] ?? null)} />
          <Button className="w-full" onClick={handlePickup} disabled={!contentOk || !sizeOk || !pickupProof}>Confirmer la prise en charge</Button>
        </Card>
      )}

      {role === "traveler" && (deal.status === "mutually_accepted" || deal.status === "picked_up") && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Confirmer la livraison</p>
          <Input placeholder="MAAK-7842-XK" value={deliveryCodeInput} onChange={(e) => setDeliveryCodeInput(e.target.value.toUpperCase())} />
          <Button className="w-full maak-primary-btn" onClick={handleVerifyDeliveryCode}>Valider le code</Button>
        </Card>
      )}

      {deal.status === "delivered_confirmed" && (
        <Card className="maak-card-soft p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Livraison confirmée ✅</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="w-full" onClick={() => navigate("/safety")}>
          <ShieldAlert className="h-4 w-4 mr-2" /> Signaler
        </Button>
        {deal.status === "delivered_confirmed" && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/profile/ratings")}>Laisser un avis</Button>
        )}
      </div>
    </div>
  );
}
