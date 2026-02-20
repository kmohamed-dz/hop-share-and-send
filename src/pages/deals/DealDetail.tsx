import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  isChatUnlocked,
  isDealClosed,
  isMutuallyAcceptedOrLater,
  normalizeDealStatus,
  syncMarketplaceExpirations,
} from "@/lib/marketplace";
import { toast } from "sonner";

type DealExt = Tables<"deals"> & {
  accepted_at?: string | null;
  closed_at?: string | null;
  delivered_at?: string | null;
  delivery_confirmed_at?: string | null;
  delivered_confirmed_at?: string | null;
  payment_status?: string | null;
  pickup_place?: string | null;
  dropoff_place?: string | null;
  parcel_id?: string | null;
  sender_id?: string | null;
  traveler_id?: string | null;
  pickup_point_address?: string | null;
  pickup_point_set_at?: string | null;
  sender_accepted_at?: string | null;
  traveler_accepted_at?: string | null;
};

type ParcelExt = Tables<"parcel_requests"> & {
  sender_id?: string | null;
  dropoff_place?: string | null;
  delivery_point_address?: string | null;
  delivery_point_type?: string | null;
};

type DeliveryCodeIssueResponse = {
  code: string;
  code_last4: string;
};

const DELIVERY_POINT_TYPE_LABEL: Record<string, string> = {
  airport: "Aéroport",
  bus_station: "Gare routière",
  delivery_office: "Bureau de livraison",
  public_place: "Lieu public",
  train_station: "Gare ferroviaire",
};

function mapDeliveryPointType(value: string | null | undefined): string {
  if (!value) return "Non défini";
  return DELIVERY_POINT_TYPE_LABEL[value] ?? value;
}

export default function DealDetail() {
  const { dealId: dealIdParam, id: dealIdAlias } = useParams<{ dealId?: string; id?: string }>();
  const dealId = dealIdParam ?? dealIdAlias;

  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealExt | null>(null);
  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [parcel, setParcel] = useState<ParcelExt | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [travelerPhone, setTravelerPhone] = useState<string>("");
  const [senderCode, setSenderCode] = useState<string>("");
  const [senderCodeHint, setSenderCodeHint] = useState<string>("");
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [pickupPointAddress, setPickupPointAddress] = useState("");
  const [dropoffPlaceAddress, setDropoffPlaceAddress] = useState("");
  const [contentOk, setContentOk] = useState(false);
  const [sizeOk, setSizeOk] = useState(false);
  const [pickupProof, setPickupProof] = useState<File | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const normalizedStatus = normalizeDealStatus(deal?.status ?? "");
  const canChat = isChatUnlocked(normalizedStatus);
  const mutualOrLater = isMutuallyAcceptedOrLater(normalizedStatus);
  const closed = isDealClosed(normalizedStatus);
  const senderUserId = deal?.sender_id ?? deal?.owner_user_id;
  const travelerUserId = deal?.traveler_id ?? deal?.traveler_user_id;

  const role = useMemo(() => {
    if (!deal || !myUserId) return "unknown";
    if (senderUserId === myUserId) return "sender";
    if (travelerUserId === myUserId) return "traveler";
    return "unknown";
  }, [deal, myUserId, senderUserId, travelerUserId]);

  const canAccept = ["proposed", "accepted_by_sender", "accepted_by_traveler"].includes(normalizedStatus);
  const canTravelerConfirmPickup = role === "traveler" && normalizedStatus === "mutually_accepted";
  const canTravelerConfirmDelivery = role === "traveler" && normalizedStatus === "picked_up";

  const counterpartyUserId = useMemo(() => {
    if (!deal) return "";
    if (role === "sender") return travelerUserId ?? "";
    if (role === "traveler") return senderUserId ?? "";
    return "";
  }, [deal, role, senderUserId, travelerUserId]);

  const codeStorageKey = dealId ? `maak_delivery_code_${dealId}` : "";

  const loadDeal = async () => {
    if (!dealId) return;

    await syncMarketplaceExpirations();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    setMyUserId(user?.id ?? null);

    const { data: dealDataRaw } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    const dealData = dealDataRaw as DealExt | null;
    setDeal(dealData);

    if (!dealData) {
      return;
    }

    setPickupPointAddress(dealData.pickup_place ?? dealData.pickup_point_address ?? "");
    setDropoffPlaceAddress(dealData.dropoff_place ?? "");

    const [tripRes, parcelRes] = await Promise.all([
      dealData.trip_id ? supabase.from("trips").select("*").eq("id", dealData.trip_id).maybeSingle() : Promise.resolve({ data: null }),
      (dealData.parcel_id ?? dealData.parcel_request_id)
        ? supabase
            .from("parcel_requests")
            .select("*")
            .eq("id", dealData.parcel_id ?? dealData.parcel_request_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setTrip((tripRes as { data: Tables<"trips"> | null }).data ?? null);
    const parcelData = (parcelRes as { data: ParcelExt | null }).data ?? null;
    setParcel(parcelData);
    if (!dealData.dropoff_place && parcelData) {
      setDropoffPlaceAddress(parcelData.dropoff_place ?? parcelData.delivery_point_address ?? "");
    }

    if (isChatUnlocked(dealData.status)) {
      const senderId = dealData.sender_id ?? dealData.owner_user_id;
      const travelerId = dealData.traveler_id ?? dealData.traveler_user_id;
      if (senderId && travelerId) {
        const [senderContact, travelerContact] = await Promise.all([
          supabase.from("private_contacts" as never).select("phone").eq("user_id", senderId).maybeSingle(),
          supabase.from("private_contacts" as never).select("phone").eq("user_id", travelerId).maybeSingle(),
        ]);

        setSenderPhone((senderContact.data as { phone?: string } | null)?.phone ?? "");
        setTravelerPhone((travelerContact.data as { phone?: string } | null)?.phone ?? "");
      } else {
        setSenderPhone("");
        setTravelerPhone("");
      }
    } else {
      setSenderPhone("");
      setTravelerPhone("");
    }

    if (user?.id === (dealData.sender_id ?? dealData.owner_user_id)) {
      const storedCode = localStorage.getItem(codeStorageKey);
      setSenderCode(storedCode ?? "");

      const { data: deliveryCodeData } = await supabase
        .from("delivery_codes" as never)
        .select("code_last4")
        .eq("deal_id", dealId)
        .maybeSingle();

      setSenderCodeHint((deliveryCodeData as { code_last4?: string } | null)?.code_last4 ?? "");
    } else {
      setSenderCode("");
      setSenderCodeHint("");
    }
  };

  useEffect(() => {
    void loadDeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const issueOwnerCode = async (silent = false) => {
    if (!dealId) return;

    const { data, error } = await supabase.rpc("issue_delivery_code_for_owner" as never, {
      p_deal_id: dealId,
    } as never);

    if (error) {
      if (!silent) toast.error(error.message);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as DeliveryCodeIssueResponse | undefined;
    const code = row?.code;

    if (!code) {
      if (!silent) toast.error("Code non disponible.");
      return;
    }

    localStorage.setItem(codeStorageKey, code);
    setSenderCode(code);
    setSenderCodeHint(row.code_last4 ?? "");
    if (!silent) {
      toast.success("Code secret généré");
    }
  };

  useEffect(() => {
    if (!dealId || role !== "sender" || !mutualOrLater || closed) return;

    const existing = localStorage.getItem(codeStorageKey);
    if (existing) {
      setSenderCode(existing);
      return;
    }

    void issueOwnerCode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, role, mutualOrLater, closed, codeStorageKey]);

  const handleAccept = async () => {
    if (!dealId) return;
    const { error } = await supabase.rpc("accept_deal" as never, { p_deal_id: dealId } as never);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Acceptation enregistrée");
    await loadDeal();
  };

  const handleSetPickupPlace = async () => {
    if (!dealId || !pickupPointAddress.trim()) {
      toast.error("Point A requis");
      return;
    }

    const { error } = await supabase.rpc("set_pickup_place" as never, {
      p_deal_id: dealId,
      p_pickup_place: pickupPointAddress.trim(),
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Point A enregistré");
    await loadDeal();
  };

  const handleSetDropoffPlace = async () => {
    if (!dealId || !dropoffPlaceAddress.trim()) {
      toast.error("Point B requis");
      return;
    }

    const { error } = await supabase.rpc("set_dropoff_place" as never, {
      p_deal_id: dealId,
      p_dropoff_place: dropoffPlaceAddress.trim(),
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Point B enregistré");
    await loadDeal();
  };

  const handlePickup = async () => {
    if (!dealId) return;

    let proofReference = "fonction-a-venir://pickup-proof";

    if (pickupProof) {
      const filePath = `${dealId}/pickup-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("handoff_proofs")
        .upload(filePath, pickupProof, { upsert: false });

      if (uploadError) {
        toast.info("Upload indisponible, preuve marquée comme fonction à venir.");
      } else {
        proofReference = `storage://handoff_proofs/${filePath}`;
      }
    }

    const { data, error } = await supabase.rpc("confirm_pickup" as never, {
      p_content_ok: contentOk,
      p_deal_id: dealId,
      p_photo_url: proofReference,
      p_size_ok: sizeOk,
    } as never);

    if (error || !data) {
      toast.error(error?.message ?? "Confirmation pickup impossible");
      return;
    }

    toast.success("Pickup confirmé");
    await loadDeal();
  };

  const handleVerifyDeliveryCode = async () => {
    if (!dealId || !deliveryCodeInput.trim()) return;

    const { data, error } = await supabase.rpc("verify_delivery_code" as never, {
      p_code: deliveryCodeInput.trim().toUpperCase(),
      p_deal_id: dealId,
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = (data as { message: string; success: boolean }[] | null)?.[0];

    if (!result?.success) {
      toast.error(result?.message ?? "Code incorrect");
      return;
    }

    localStorage.removeItem(codeStorageKey);
    toast.success(result.message);
    await loadDeal();
  };

  const handleCloseDeal = async () => {
    if (!dealId) return;

    const { error } = await supabase.rpc("close_deal" as never, {
      p_deal_id: dealId,
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Deal clôturé");
    await loadDeal();
  };

  if (!deal) {
    return (
      <div className="mobile-page">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const hasMutualAcceptance = ["mutually_accepted", "picked_up", "delivered_confirmed", "closed"].includes(normalizedStatus);
  const hasPickupConfirmed = ["picked_up", "delivered_confirmed", "closed"].includes(normalizedStatus);
  const hasDelivered = Boolean(
    deal.delivered_confirmed_at ||
      deal.delivery_confirmed_at ||
      deal.delivered_at ||
      ["delivered_confirmed", "closed"].includes(normalizedStatus)
  );
  const deliveryConfirmed = ["delivered_confirmed", "closed"].includes(normalizedStatus);
  const hasClosed = normalizedStatus === "closed" || Boolean(deal.closed_at);

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Détail du deal</h1>
      </div>

      <Card className="maak-card p-4 space-y-2">
        <p className="text-sm font-semibold">{trip?.origin_wilaya} → {trip?.destination_wilaya}</p>
        <p className="text-xs text-muted-foreground">Statut: {normalizedStatus}</p>
        <p className="text-xs text-muted-foreground">
          Colis: {parcel?.category} • {parcel?.size_weight ?? "taille N/A"} • {parcel?.reward_dzd ?? 0} DZD
        </p>
      </Card>

      <Card className="maak-card p-4 space-y-2">
        <p className="text-sm font-semibold">Points de remise</p>
        <p className="text-xs text-muted-foreground">
          Point A (pickup voyageur): {deal.pickup_place || deal.pickup_point_address || "En attente de définition"}
        </p>
        <p className="text-xs text-muted-foreground">
          Point B (livraison expéditeur): {deal.dropoff_place || parcel?.dropoff_place || parcel?.delivery_point_address || "Non défini"}
        </p>
        <p className="text-xs text-muted-foreground">
          Type point B: {mapDeliveryPointType(parcel?.delivery_point_type)}
        </p>
      </Card>

      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">Timeline du deal</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="text-foreground">• Proposé</li>
          <li className={deal.sender_accepted_at ? "text-foreground" : ""}>• Accepté par l'expéditeur</li>
          <li className={deal.traveler_accepted_at ? "text-foreground" : ""}>• Accepté par le voyageur</li>
          <li className={hasMutualAcceptance ? "text-foreground" : ""}>• Mutuellement accepté</li>
          <li className={hasPickupConfirmed ? "text-foreground" : ""}>• Pickup confirmé</li>
          <li className={hasDelivered ? "text-foreground" : ""}>• Livraison confirmée</li>
          <li className={hasClosed ? "text-foreground" : ""}>• Clôturé</li>
        </ul>
      </Card>

      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">Confidentialité progressive</p>
        {canChat ? (
          <div className="space-y-2">
            <p className="text-sm">Contact expéditeur: {senderPhone || "N/A"}</p>
            <p className="text-sm">Contact transporteur: {travelerPhone || "N/A"}</p>
            <Button className="w-full" variant="outline" onClick={() => navigate(`/messages/${deal.id}`)}>
              Ouvrir le chat
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Contact et chat verrouillés avant acceptation mutuelle.</p>
        )}
      </Card>

      <Collapsible open={safetyOpen} onOpenChange={setSafetyOpen}>
        <Card className="maak-card p-4">
          <CollapsibleTrigger className="w-full flex items-center justify-between text-left">
            <span className="text-sm font-semibold">Sécurité</span>
            {safetyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Le contact direct reste masqué avant consentement bilatéral</li>
              <li>Le code secret est exigé pour clôturer la livraison</li>
            </ul>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link className="text-primary font-medium hover:underline" to="/processus/remise">
                Voir le processus de remise
              </Link>
              <Link className="text-primary font-medium hover:underline" to="/processus/contact">
                Voir le protocole de contact
              </Link>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {canAccept && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Acceptation bilatérale</p>
          {role === "traveler" && (
            <>
              <Input
                placeholder="Point A (pickup) défini par le voyageur"
                value={pickupPointAddress}
                onChange={(event) => setPickupPointAddress(event.target.value)}
              />
              <Button className="w-full" variant="outline" onClick={handleSetPickupPlace}>
                Enregistrer le point A
              </Button>
            </>
          )}
          {role === "sender" && (
            <>
              <Input
                placeholder="Point B (livraison) défini par l'expéditeur"
                value={dropoffPlaceAddress}
                onChange={(event) => setDropoffPlaceAddress(event.target.value)}
              />
              <Button className="w-full" variant="outline" onClick={handleSetDropoffPlace}>
                Enregistrer le point B
              </Button>
            </>
          )}
          <Button className="w-full maak-primary-btn" onClick={handleAccept}>
            Accepter ce deal
          </Button>
        </Card>
      )}

      {role === "sender" && mutualOrLater && !deliveryConfirmed && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Code secret de livraison</p>
          <p className="text-xs text-muted-foreground">Visible uniquement à l'expéditeur. Ne pas partager avant la remise finale.</p>
          <p className="text-lg font-black tracking-wider">{senderCode || "MAAK-XXXX-XX"}</p>
          {senderCodeHint && !senderCode && (
            <p className="text-xs text-muted-foreground">Derniers caractères enregistrés: {senderCodeHint}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void issueOwnerCode(false)} className="w-full" variant="outline">
              {senderCode ? "Régénérer" : "Générer"}
            </Button>
            <Button
              onClick={() => navigate(`/messages/${deal.id}`)}
              className="w-full"
              variant="outline"
              disabled={!canChat}
            >
              Chat
            </Button>
          </div>
        </Card>
      )}

      {canTravelerConfirmPickup && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Confirmer le pickup</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={contentOk} onChange={(event) => setContentOk(event.target.checked)} /> Contenu conforme
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sizeOk} onChange={(event) => setSizeOk(event.target.checked)} /> Taille/poids conformes
          </label>
          <Input type="file" accept="image/*" onChange={(event) => setPickupProof(event.target.files?.[0] ?? null)} />
          <Button className="w-full" onClick={handlePickup} disabled={!contentOk || !sizeOk}>
            Confirmer pickup
          </Button>
        </Card>
      )}

      {canTravelerConfirmDelivery && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Valider la livraison</p>
          <Input
            placeholder="MAAK-1234-AB"
            value={deliveryCodeInput}
            onChange={(event) => setDeliveryCodeInput(event.target.value.toUpperCase())}
          />
          <Button className="w-full maak-primary-btn" onClick={handleVerifyDeliveryCode}>
            Vérifier le code
          </Button>
        </Card>
      )}

      {normalizedStatus === "delivered_confirmed" && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">Finaliser le deal</p>
          <p className="text-xs text-muted-foreground">
            La livraison est confirmée. Clôturez le deal pour débloquer un nouveau matching.
          </p>
          <Button className="w-full" onClick={handleCloseDeal}>
            Clôturer le deal
          </Button>
        </Card>
      )}

      {closed && (
        <Card className="maak-card-soft p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Deal clôturé ✅</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const params = new URLSearchParams();
            params.set("dealId", deal.id);
            if (counterpartyUserId) params.set("targetUserId", counterpartyUserId);
            navigate(`/safety?${params.toString()}`);
          }}
        >
          <ShieldAlert className="h-4 w-4 mr-2" /> Signaler
        </Button>
        {deliveryConfirmed && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/profile/ratings")}>
            Laisser un avis
          </Button>
        )}
      </div>
    </div>
  );
}
