import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  MapPin,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  DEAL_POINT_TYPES,
  isChatUnlocked,
  isDealClosed,
  isMutuallyAcceptedOrLater,
  mapPointTypeLabel,
  normalizeDealStatus,
  normalizePointType,
  syncMarketplaceExpirations,
} from "@/lib/marketplace";
import { toast } from "sonner";

type DealExt = Tables<"deals"> & {
  accepted_at?: string | null;
  closed_at?: string | null;
  delivered_at?: string | null;
  delivered_confirmed_at?: string | null;
  delivery_confirmed_at?: string | null;
  delivery_place_text?: string | null;
  dropoff_place?: string | null;
  dropoff_point_type?: string | null;
  mutual_accepted_at?: string | null;
  payment_status?: string | null;
  parcel_id?: string | null;
  pickup_confirmed_at?: string | null;
  pickup_location_selected_at?: string | null;
  pickup_place_text?: string | null;
  pickup_place_type?: string | null;
  pickup_place?: string | null;
  pickup_point_address?: string | null;
  pickup_point_set_at?: string | null;
  pickup_point_type?: string | null;
  secret_code_last4?: string | null;
  sender_id?: string | null;
  sender_accepted_at?: string | null;
  traveler_accepted_at?: string | null;
  traveler_id?: string | null;
};

type ParcelExt = Tables<"parcel_requests"> & {
  dropoff_place_text?: string | null;
  dropoff_place_type?: string | null;
  delivery_point_address?: string | null;
  delivery_point_type?: string | null;
  dropoff_place?: string | null;
  pickup_area_text?: string | null;
  pickup_radius_km?: number | null;
  sender_id?: string | null;
};

type DeliveryCodeIssueResponse = {
  code: string;
  code_last4: string;
};

function hasRpcSignatureError(message: string): boolean {
  return /No function matches|function .* does not exist|Could not choose the best candidate function/i.test(message);
}

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function TimelineStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
          done ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
      </span>
      <span className={`text-sm ${done ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

export default function DealDetail() {
  const { dealId: dealIdParam, id: dealIdAlias } = useParams<{ dealId?: string; id?: string }>();
  const dealId = dealIdParam ?? dealIdAlias;
  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealExt | null>(null);
  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [parcel, setParcel] = useState<ParcelExt | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [senderPhone, setSenderPhone] = useState("");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [senderCode, setSenderCode] = useState("");
  const [senderCodeHint, setSenderCodeHint] = useState("");
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");

  const [pickupPointAddress, setPickupPointAddress] = useState("");
  const [pickupPointType, setPickupPointType] = useState("");
  const [dropoffPlaceAddress, setDropoffPlaceAddress] = useState("");
  const [dropoffPlaceType, setDropoffPlaceType] = useState("");

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

  const canTravelerAccept = role === "traveler" && normalizedStatus === "proposed";
  const canSenderAccept = role === "sender" && normalizedStatus === "accepted_by_traveler";
  const canLegacyTravelerAccept = role === "traveler" && normalizedStatus === "accepted_by_sender";
  const canAccept = canTravelerAccept || canSenderAccept || canLegacyTravelerAccept;

  const pickupSet = isFilled(deal?.pickup_place_text ?? deal?.pickup_place ?? deal?.pickup_point_address);
  const dropoffSet = isFilled(deal?.dropoff_place ?? deal?.delivery_place_text);
  const delivered = ["delivered", "closed"].includes(normalizedStatus) || Boolean(deal?.delivered_at);
  const deliveryConfirmed = ["delivered", "closed"].includes(normalizedStatus);
  const pickupLocationSelected = normalizedStatus === "pickup_location_selected";
  const pickupLocationConfirmed = normalizedStatus === "pickup_location_confirmed";

  const canTravelerConfirmPickup = role === "traveler" && pickupLocationConfirmed && pickupSet;
  const canSenderConfirmPickupLocation = role === "sender" && pickupLocationSelected && pickupSet;
  const canTravelerMarkInTransit = role === "traveler" && normalizedStatus === "picked_up";
  const canTravelerConfirmDelivery =
    role === "traveler" && ["pickup_location_confirmed", "picked_up", "in_transit"].includes(normalizedStatus);
  const canEditPoints = ["mutually_accepted", "pickup_location_selected"].includes(normalizedStatus);

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

    const { data: dealDataRaw, error: dealError } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    const dealData = dealDataRaw as DealExt | null;

    if (dealError || !dealData) {
      toast.error("Deal introuvable.");
      navigate("/activity");
      return;
    }

    setDeal(dealData);

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

    const tripData = (tripRes as { data: Tables<"trips"> | null }).data ?? null;
    const parcelData = (parcelRes as { data: ParcelExt | null }).data ?? null;
    setParcel(parcelData);

    const nextPickupAddress = dealData.pickup_place_text ?? dealData.pickup_place ?? dealData.pickup_point_address ?? "";
    const nextDropoffAddress =
      dealData.dropoff_place ??
      dealData.delivery_place_text ??
      parcelData?.dropoff_place_text ??
      parcelData?.dropoff_place ??
      parcelData?.delivery_point_address ??
      "";

    setPickupPointAddress(nextPickupAddress);
    setDropoffPlaceAddress(nextDropoffAddress);
    setPickupPointType(normalizePointType(dealData.pickup_place_type ?? dealData.pickup_point_type ?? null));
    setDropoffPlaceType(
      normalizePointType(dealData.dropoff_point_type ?? parcelData?.dropoff_place_type ?? parcelData?.delivery_point_type ?? null)
    );

    if (isChatUnlocked(dealData.status)) {
      const senderId =
        dealData.sender_id ??
        dealData.owner_user_id ??
        parcelData?.sender_id ??
        parcelData?.user_id ??
        null;
      const travelerId =
        dealData.traveler_id ??
        dealData.traveler_user_id ??
        (tripData as (Tables<"trips"> & { traveler_id?: string }) | null)?.traveler_id ??
        tripData?.user_id ??
        null;
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

      setSenderCodeHint(dealData.secret_code_last4 ?? "");
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
    if (!silent) toast.success("Code secret généré");
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
      if (/Le voyageur doit définir le point de pickup/i.test(error.message)) {
        toast.error("Backend non aligné: appliquez la migration accept_deal_no_pickup_gate puis réessayez.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success("Acceptation enregistrée");
    await loadDeal();
  };

  const handleSetPickupPlace = async () => {
    if (!dealId) return;
    if (!["mutually_accepted", "pickup_location_selected"].includes(normalizedStatus)) {
      toast.error("Le point A est disponible après acceptation mutuelle.");
      return;
    }
    if (!pickupPointType || !pickupPointAddress.trim()) {
      toast.error("Type et adresse du point A requis.");
      return;
    }

    let { error } = await supabase.rpc("set_pickup_place" as never, {
      p_deal_id: dealId,
      p_pickup_place: pickupPointAddress.trim(),
      p_pickup_type: pickupPointType,
    } as never);

    if (error && hasRpcSignatureError(error.message)) {
      const fallback = await supabase.rpc("set_pickup_place" as never, {
        p_deal_id: dealId,
        p_pickup_place: pickupPointAddress.trim(),
      } as never);
      error = fallback.error;
    }

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Point A enregistré");
    await loadDeal();
  };

  const handleSetDropoffPlace = async () => {
    if (!dealId) return;
    if (!["mutually_accepted", "pickup_location_selected"].includes(normalizedStatus)) {
      toast.error("Le point B est disponible après acceptation mutuelle.");
      return;
    }
    if (!dropoffPlaceType || !dropoffPlaceAddress.trim()) {
      toast.error("Type et adresse du point B requis.");
      return;
    }

    let { error } = await supabase.rpc("set_dropoff_place" as never, {
      p_deal_id: dealId,
      p_dropoff_place: dropoffPlaceAddress.trim(),
      p_dropoff_type: dropoffPlaceType,
    } as never);

    if (error && hasRpcSignatureError(error.message)) {
      const fallback = await supabase.rpc("set_dropoff_place" as never, {
        p_deal_id: dealId,
        p_dropoff_place: dropoffPlaceAddress.trim(),
      } as never);
      error = fallback.error;
    }

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Point B enregistré");
    await loadDeal();
  };

  const handleConfirmPickupLocation = async () => {
    if (!dealId) return;
    const { error } = await supabase.rpc("confirm_pickup_location" as never, {
      p_deal_id: dealId,
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Point A confirmé par l'expéditeur");
    await loadDeal();
  };

  const handlePickup = async () => {
    if (!dealId) return;

    let proofReference = "fonction-a-venir://pickup-proof";
    if (pickupProof) {
      const filePath = `${dealId}/pickup-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("handoff_proofs").upload(filePath, pickupProof, {
        upsert: false,
      });

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

  const handleMarkInTransit = async () => {
    if (!dealId) return;

    const { error } = await supabase.rpc("mark_in_transit" as never, {
      p_deal_id: dealId,
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Statut mis à jour: en transit");
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

  const timelineSteps = [
    { done: true, label: "Proposé" },
    {
      done: [
        "accepted_by_sender",
        "accepted_by_traveler",
        "mutually_accepted",
        "pickup_location_selected",
        "pickup_location_confirmed",
        "picked_up",
        "in_transit",
        "delivered",
        "closed",
      ].includes(normalizedStatus),
      label: "Accepté",
    },
    { done: pickupSet, label: "Pickup A défini" },
    { done: dropoffSet, label: "Dropoff B défini" },
    { done: delivered, label: "Livré" },
  ];

  const pickupAddressRead = deal.pickup_place_text ?? deal.pickup_place ?? deal.pickup_point_address ?? "En attente";
  const dropoffAddressRead =
    deal.dropoff_place ??
    deal.delivery_place_text ??
    parcel?.dropoff_place_text ??
    parcel?.dropoff_place ??
    parcel?.delivery_point_address ??
    "En attente";

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="maak-section-title">Détail du deal</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="maak-card p-5 space-y-2">
            <p className="text-sm font-semibold">
              {trip?.origin_wilaya} → {trip?.destination_wilaya}
            </p>
            <p className="text-xs text-muted-foreground">Statut actuel: {normalizedStatus}</p>
            <p className="text-xs text-muted-foreground">
              Colis: {parcel?.category} • {parcel?.size_weight ?? "taille N/A"} • {parcel?.reward_dzd ?? 0} DZD
            </p>
          </Card>

          <Card className="maak-card p-5 space-y-3">
            <p className="text-sm font-semibold">Timeline</p>
            <div className="space-y-2">
              {timelineSteps.map((step) => (
                <TimelineStep key={step.label} done={step.done} label={step.label} />
              ))}
            </div>
          </Card>

          {canAccept && (
            <Card className="maak-card p-5 space-y-3">
              <p className="text-sm font-semibold">Acceptation bilatérale</p>
              {canTravelerAccept && (
                <p className="text-xs text-muted-foreground">
                  En tant que voyageur, acceptez d'abord le deal. Le sender pourra confirmer ensuite.
                </p>
              )}
              {canSenderAccept && (
                <p className="text-xs text-muted-foreground">
                  Le voyageur a accepté. Validez maintenant pour passer en <span className="font-semibold">mutually_accepted</span>.
                </p>
              )}
              {canLegacyTravelerAccept && (
                <p className="text-xs text-muted-foreground">
                  Deal intermédiaire détecté. Votre acceptation finalisera l'étape mutuelle.
                </p>
              )}
              <Button className="w-full maak-primary-btn" onClick={handleAccept}>
                Accepter ce deal
              </Button>
            </Card>
          )}

          {role === "sender" && normalizedStatus === "proposed" && (
            <Card className="maak-card p-5">
              <p className="text-sm text-muted-foreground">
                En attente: le voyageur doit accepter le deal avant votre validation finale.
              </p>
            </Card>
          )}

          <Card className="maak-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Points de handoff</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Point A (pickup voyageur)</p>
              <p className="text-sm font-medium">{pickupAddressRead}</p>
              <p className="text-xs text-muted-foreground">
                Type: {mapPointTypeLabel(deal.pickup_place_type ?? deal.pickup_point_type ?? pickupPointType)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Point B (dropoff expéditeur)</p>
              <p className="text-sm font-medium">{dropoffAddressRead}</p>
              <p className="text-xs text-muted-foreground">
                Type: {mapPointTypeLabel(deal.dropoff_point_type ?? parcel?.dropoff_place_type ?? parcel?.delivery_point_type ?? dropoffPlaceType)}
              </p>
            </div>
            {(parcel?.pickup_radius_km || parcel?.pickup_area_text) && (
              <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                {parcel?.pickup_radius_km ? <p>Rayon pickup demandé: {parcel.pickup_radius_km} km</p> : null}
                {parcel?.pickup_area_text ? <p>Zone pickup demandée: {parcel.pickup_area_text}</p> : null}
              </div>
            )}
          </Card>

          {canEditPoints && !deliveryConfirmed && !closed ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="maak-card p-5 space-y-3">
                <p className="text-sm font-semibold">Point A - Pickup (voyageur)</p>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={pickupPointType} onValueChange={setPickupPointType} disabled={role !== "traveler"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_POINT_TYPES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Adresse *</Label>
                  <Input
                    value={pickupPointAddress}
                    onChange={(event) => setPickupPointAddress(event.target.value)}
                    placeholder="Adresse du point A"
                    disabled={role !== "traveler"}
                  />
                </div>
                <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Carte : à venir
                </div>
                {role === "traveler" ? (
                  <Button className="w-full" variant="outline" onClick={handleSetPickupPlace}>
                    Enregistrer le point A
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Seul le voyageur peut définir le point A.</p>
                )}
              </Card>

              <Card className="maak-card p-5 space-y-3">
                <p className="text-sm font-semibold">Point B - Dropoff (expéditeur)</p>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={dropoffPlaceType} onValueChange={setDropoffPlaceType} disabled={role !== "sender"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_POINT_TYPES.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Adresse *</Label>
                  <Input
                    value={dropoffPlaceAddress}
                    onChange={(event) => setDropoffPlaceAddress(event.target.value)}
                    placeholder="Adresse du point B"
                    disabled={role !== "sender"}
                  />
                </div>
                <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Carte : à venir
                </div>
                {role === "sender" ? (
                  <Button className="w-full" variant="outline" onClick={handleSetDropoffPlace}>
                    Enregistrer le point B
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Seul l'expéditeur peut définir le point B.</p>
                )}
              </Card>
            </div>
          ) : (
            <Card className="maak-card p-5">
              <p className="text-sm text-muted-foreground">
                Les points A/B se débloquent uniquement après acceptation mutuelle.
              </p>
            </Card>
          )}

          {role === "traveler" && normalizedStatus === "mutually_accepted" && (!pickupSet || !dropoffSet) && (
            <Card className="maak-card-soft p-4">
              <p className="text-sm font-medium">Définissez le point A pour permettre la confirmation expéditeur.</p>
            </Card>
          )}

          {canSenderConfirmPickupLocation && (
            <Card className="maak-card p-5 space-y-3">
              <p className="text-sm font-semibold">Validation expéditeur</p>
              <p className="text-xs text-muted-foreground">
                Confirmez le point A proposé par le transporteur pour passer à l'étape pickup confirmé.
              </p>
              <Button className="w-full" onClick={handleConfirmPickupLocation}>
                Confirmer le point A
              </Button>
            </Card>
          )}

          {canTravelerConfirmPickup && (
            <Card className="maak-card p-5 space-y-3">
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

          {canTravelerMarkInTransit && (
            <Card className="maak-card p-5 space-y-3">
              <p className="text-sm font-semibold">Transport en cours</p>
              <p className="text-xs text-muted-foreground">
                Passez le deal en in_transit une fois le colis pris en charge.
              </p>
              <Button className="w-full" variant="outline" onClick={handleMarkInTransit}>
                Marquer en transit
              </Button>
            </Card>
          )}

          {canTravelerConfirmDelivery && (
            <Card className="maak-card p-5 space-y-3">
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

          {normalizedStatus === "delivered" && (
            <Card className="maak-card p-5 space-y-3">
              <p className="text-sm font-semibold">Finaliser le deal</p>
              <p className="text-xs text-muted-foreground">
                La livraison est confirmée. Clôturez le deal pour débloquer un nouveau matching.
              </p>
              <Button className="w-full" onClick={handleCloseDeal}>
                Clôturer le deal
              </Button>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="maak-card p-5">
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
            <Card className="maak-card p-5">
              <CollapsibleTrigger className="w-full flex items-center justify-between text-left">
                <span className="text-sm font-semibold">Sécurité</span>
                {safetyOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>Le contact direct reste masqué avant consentement bilatéral.</li>
                  <li>Les points A/B se configurent seulement après acceptation mutuelle.</li>
                </ul>
                <div className="flex flex-col gap-1.5 text-sm">
                  <Link className="text-primary font-medium hover:underline" to="/processus/contact">
                    Voir le protocole de contact
                  </Link>
                  <Link className="text-primary font-medium hover:underline" to="/processus/remise">
                    Voir le processus de remise
                  </Link>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {role === "sender" && mutualOrLater && !deliveryConfirmed && (
            <Card className="maak-card p-5 space-y-3">
              <p className="text-sm font-semibold">Code secret de livraison</p>
              <p className="text-xs text-muted-foreground">
                Visible uniquement à l'expéditeur. Ne pas partager avant la remise finale.
              </p>
              <p className="text-lg font-black tracking-wider">{senderCode || "MAAK-XXXX-XX"}</p>
              {senderCodeHint && !senderCode && (
                <p className="text-xs text-muted-foreground">Derniers caractères enregistrés: {senderCodeHint}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => void issueOwnerCode(false)} className="w-full" variant="outline">
                  {senderCode ? "Régénérer" : "Générer"}
                </Button>
                <Button onClick={() => navigate(`/messages/${deal.id}`)} className="w-full" variant="outline" disabled={!canChat}>
                  Chat
                </Button>
              </div>
            </Card>
          )}

          {closed && (
            <Card className="maak-card-soft p-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Deal clôturé</p>
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
      </div>
    </div>
  );
}
