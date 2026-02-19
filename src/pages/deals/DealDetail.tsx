import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Deal = Tables<"deals">;

const STATUS_ORDER = [
  "proposed",
  "accepted_by_sender",
  "accepted_by_traveler",
  "mutually_accepted",
  "pickup_confirmed",
  "delivered",
  "closed",
] as const;

function normalizeDealStatus(status: string): string {
  if (status === "picked_up") return "pickup_confirmed";
  if (status === "delivered_confirmed") return "delivered";
  if (status === "accepted") return "mutually_accepted";
  return status;
}

function isUnlockedStatus(status: string): boolean {
  const s = normalizeDealStatus(status);
  return ["mutually_accepted", "pickup_confirmed", "delivered", "closed"].includes(s);
}

export default function DealDetail() {
  const { dealId: dealIdParam, id: dealIdAlias } = useParams<{ dealId?: string; id?: string }>();
  const dealId = dealIdParam ?? dealIdAlias;
  const navigate = useNavigate();
  const { language } = useAppLanguage();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [parcel, setParcel] = useState<Tables<"parcel_requests"> | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [senderPhone, setSenderPhone] = useState("");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [deliveryPlaceInput, setDeliveryPlaceInput] = useState("");
  const [contentOk, setContentOk] = useState(false);
  const [sizeOk, setSizeOk] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const normalizedStatus = normalizeDealStatus(deal?.status ?? "");
  const unlocked = isUnlockedStatus(normalizedStatus);
  const closed = normalizedStatus === "closed" || normalizedStatus === "delivered";

  const role = useMemo(() => {
    if (!deal || !myUserId) return "unknown";
    if (deal.owner_user_id === myUserId) return "sender";
    if (deal.traveler_user_id === myUserId) return "traveler";
    return "unknown";
  }, [deal, myUserId]);

  const loadDeal = async () => {
    if (!dealId) return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    setMyUserId(user?.id ?? null);

    const { data: dealData } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    setDeal(dealData);
    if (!dealData) return;

    setDeliveryPlaceInput(dealData.delivery_place_text ?? "");

    const [tripRes, parcelRes] = await Promise.all([
      dealData.trip_id ? supabase.from("trips").select("*").eq("id", dealData.trip_id).maybeSingle() : Promise.resolve({ data: null }),
      dealData.parcel_request_id
        ? supabase.from("parcel_requests").select("*").eq("id", dealData.parcel_request_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setTrip(tripRes.data ?? null);
    setParcel(parcelRes.data ?? null);

    // Load phones from profiles if contact unlocked
    if (isUnlockedStatus(dealData.status)) {
      const [sP, tP] = await Promise.all([
        supabase.from("profiles").select("phone").eq("user_id", dealData.owner_user_id).maybeSingle(),
        supabase.from("profiles").select("phone").eq("user_id", dealData.traveler_user_id).maybeSingle(),
      ]);
      setSenderPhone(sP.data?.phone ?? "");
      setTravelerPhone(tP.data?.phone ?? "");
    }

    // Load delivery code for sender only
    if (user?.id === dealData.owner_user_id && isUnlockedStatus(dealData.status)) {
      const { data: codeData } = await supabase
        .from("deal_delivery_codes")
        .select("code_plain")
        .eq("deal_id", dealId)
        .maybeSingle();
      setDeliveryCode(codeData?.code_plain ?? "");
    }
  };

  useEffect(() => {
    void loadDeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  // --- Actions ---

  const handleAccept = async () => {
    if (!dealId || !deal) return;

    // Bilateral acceptance logic
    const updates: Record<string, unknown> = {};

    if (role === "sender") {
      if (deal.owner_confirmed_pickup) {
        toast.info("Déjà accepté de votre côté.");
        return;
      }
      updates.owner_confirmed_pickup = true;
      // Check if traveler already accepted
      if (deal.traveler_confirmed_pickup) {
        updates.status = "mutually_accepted";
      } else if (normalizedStatus === "proposed") {
        updates.status = "accepted_by_sender";
      }
    } else if (role === "traveler") {
      if (deal.traveler_confirmed_pickup) {
        toast.info("Déjà accepté de votre côté.");
        return;
      }
      updates.traveler_confirmed_pickup = true;
      if (deal.owner_confirmed_pickup) {
        updates.status = "mutually_accepted";
      } else if (normalizedStatus === "proposed") {
        updates.status = "accepted_by_traveler";
      }
    }

    const { error } = await supabase.from("deals").update(updates as never).eq("id", dealId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(language === "ar" ? "تم القبول" : "Acceptation enregistrée");
    await loadDeal();
  };

  const handleDecline = async () => {
    if (!dealId) return;
    const { error } = await supabase.from("deals").update({ status: "closed" }).eq("id", dealId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(language === "ar" ? "تم الرفض" : "Demande refusée");
    await loadDeal();
  };

  const handleSetDeliveryPlace = async () => {
    if (!dealId || !deliveryPlaceInput.trim()) return;
    const { error } = await supabase
      .from("deals")
      .update({
        delivery_place_text: deliveryPlaceInput.trim(),
        delivery_place_set_at: new Date().toISOString(),
      } as never)
      .eq("id", dealId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lieu de remise défini");
    await loadDeal();
  };

  const handlePickup = async () => {
    if (!dealId) return;
    const { error } = await supabase
      .from("deals")
      .update({
        status: "pickup_confirmed",
        pickup_confirmed_at: new Date().toISOString(),
        pickup_photo_url: "placeholder://photo-a-venir",
      } as never)
      .eq("id", dealId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pickup confirmé");
    await loadDeal();
  };

  const handleVerifyDeliveryCode = async () => {
    if (!dealId || !deliveryCodeInput.trim()) return;

    const { data, error } = await supabase.rpc("verify_delivery_code", {
      p_code: deliveryCodeInput.trim().toUpperCase(),
      p_deal_id: dealId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as unknown as { success: boolean; error?: string } | null;
    if (!result?.success) {
      toast.error(result?.error ?? "Code incorrect");
      return;
    }

    toast.success(language === "ar" ? "تم التسليم بنجاح" : "Livraison confirmée !");
    await loadDeal();
  };

  if (!deal) {
    return (
      <div className="mobile-page">
        <p className="text-sm text-muted-foreground">
          {language === "ar" ? "جار التحميل..." : "Chargement..."}
        </p>
      </div>
    );
  }

  const statusIndex = STATUS_ORDER.indexOf(normalizedStatus as typeof STATUS_ORDER[number]);
  const canAccept = ["proposed", "accepted_by_sender", "accepted_by_traveler"].includes(normalizedStatus);
  const canTravelerSetPlace = role === "traveler" && normalizedStatus === "mutually_accepted" && !deal.delivery_place_text;
  const canTravelerPickup = role === "traveler" && normalizedStatus === "mutually_accepted" && Boolean(deal.delivery_place_text);
  const canTravelerDeliver = role === "traveler" && normalizedStatus === "pickup_confirmed";

  const counterpartyUserId = role === "sender" ? deal.traveler_user_id : deal.owner_user_id;

  const statusLabels = language === "ar"
    ? ["مقترح", "قبول المرسل", "قبول الناقل", "قبول متبادل", "تأكيد الاستلام", "تم التسليم", "مغلق"]
    : ["Proposé", "Accepté (expéditeur)", "Accepté (transporteur)", "Mutuellement accepté", "Pickup confirmé", "Livré", "Clôturé"];

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">{language === "ar" ? "تفاصيل الصفقة" : "Détail du deal"}</h1>
      </div>

      {/* Route summary */}
      <Card className="maak-card p-4 space-y-2">
        <p className="text-sm font-semibold">{trip?.origin_wilaya} → {trip?.destination_wilaya}</p>
        <p className="text-xs text-muted-foreground">
          {language === "ar" ? "الحالة" : "Statut"}: {statusLabels[statusIndex] ?? normalizedStatus}
        </p>
        <p className="text-xs text-muted-foreground">
          {language === "ar" ? "الطرد" : "Colis"}: {parcel?.category} • {parcel?.size_weight ?? "N/A"} • {parcel?.reward_dzd ?? 0} DZD
        </p>
        {deal.message && (
          <p className="text-xs text-muted-foreground italic">"{deal.message}"</p>
        )}
      </Card>

      {/* Timeline */}
      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">{language === "ar" ? "المراحل" : "Timeline"}</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {statusLabels.map((label, i) => (
            <li key={i} className={i <= statusIndex ? "text-foreground font-medium" : ""}>
              {i <= statusIndex ? "✓" : "○"} {label}
            </li>
          ))}
        </ul>
      </Card>

      {/* Contact section */}
      <Card className="maak-card p-4">
        <p className="text-sm font-semibold mb-2">
          {language === "ar" ? "معلومات الاتصال" : "Contact"}
        </p>
        {unlocked ? (
          <div className="space-y-2">
            <p className="text-sm">{language === "ar" ? "المرسل" : "Expéditeur"}: {senderPhone || "N/A"}</p>
            <p className="text-sm">{language === "ar" ? "الناقل" : "Transporteur"}: {travelerPhone || "N/A"}</p>
            <Button className="w-full" variant="outline" onClick={() => navigate(`/messages/${deal.id}`)}>
              {language === "ar" ? "فتح المحادثة" : "Ouvrir le chat"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "الاتصال متاح بعد القبول المتبادل."
              : "Contact disponible après acceptation des deux parties."}
          </p>
        )}
      </Card>

      {/* Delivery place */}
      {deal.delivery_place_text && (
        <Card className="maak-card p-4">
          <p className="text-sm font-semibold mb-1">{language === "ar" ? "مكان التسليم" : "Lieu de remise"}</p>
          <p className="text-sm text-muted-foreground">{deal.delivery_place_text}</p>
        </Card>
      )}

      {/* Safety collapsible */}
      <Collapsible open={safetyOpen} onOpenChange={setSafetyOpen}>
        <Card className="maak-card p-4">
          <CollapsibleTrigger className="w-full flex items-center justify-between text-left">
            <span className="text-sm font-semibold">{language === "ar" ? "الأمان" : "Sécurité"}</span>
            {safetyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>{language === "ar" ? "لا يتم كشف الاتصال قبل القبول المتبادل" : "Contact masqué avant acceptation mutuelle"}</li>
              <li>{language === "ar" ? "رمز سري مطلوب لتأكيد التسليم" : "Code secret exigé pour confirmer la livraison"}</li>
            </ul>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link className="text-primary font-medium hover:underline" to="/processus/remise">
                {language === "ar" ? "عملية التسليم" : "Processus de remise"}
              </Link>
              <Link className="text-primary font-medium hover:underline" to="/processus/contact">
                {language === "ar" ? "بروتوكول الاتصال" : "Protocole de contact"}
              </Link>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Accept / Decline */}
      {canAccept && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">
            {language === "ar" ? "القبول الثنائي" : "Acceptation bilatérale"}
          </p>
          {role === "sender" && deal.owner_confirmed_pickup && (
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "أنت قبلت. في انتظار الناقل." : "Vous avez accepté. En attente du transporteur."}
            </p>
          )}
          {role === "traveler" && deal.traveler_confirmed_pickup && (
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "أنت قبلت. في انتظار المرسل." : "Vous avez accepté. En attente de l'expéditeur."}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full maak-primary-btn" onClick={handleAccept}>
              {language === "ar" ? "قبول" : "Accepter"}
            </Button>
            <Button className="w-full" variant="destructive" onClick={handleDecline}>
              {language === "ar" ? "رفض" : "Refuser"}
            </Button>
          </div>
        </Card>
      )}

      {/* Mutual accepted banner */}
      {unlocked && !closed && (
        <Card className="maak-card-soft p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">
            {language === "ar" ? "✅ تم قبول الطلب" : "✅ Demande acceptée"}
          </p>
        </Card>
      )}

      {/* Delivery place setter (traveler only) */}
      {canTravelerSetPlace && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">
            {language === "ar" ? "تحديد مكان التسليم" : "Définir le lieu de remise"}
          </p>
          <Input
            placeholder={language === "ar" ? "محطة… / عنوان…" : "Lieu de remise (ex: محطة…/Adresse…)"}
            value={deliveryPlaceInput}
            onChange={(e) => setDeliveryPlaceInput(e.target.value)}
          />
          <Button className="w-full" onClick={handleSetDeliveryPlace} disabled={!deliveryPlaceInput.trim()}>
            {language === "ar" ? "حفظ المكان" : "Enregistrer le lieu"}
          </Button>
        </Card>
      )}

      {/* Pickup confirmation (traveler) */}
      {canTravelerPickup && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">
            {language === "ar" ? "تأكيد الاستلام" : "Confirmer la prise en charge"}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={contentOk} onChange={(e) => setContentOk(e.target.checked)} />
            {language === "ar" ? "المحتوى مطابق" : "Contenu conforme"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sizeOk} onChange={(e) => setSizeOk(e.target.checked)} />
            {language === "ar" ? "الأبعاد/الوزن مطابق" : "Dimensions/poids conformes"}
          </label>
          <p className="text-xs text-muted-foreground">
            {language === "ar" ? "📷 الصورة: وظيفة قادمة" : "📷 Photo : fonction à venir"}
          </p>
          <Button className="w-full" onClick={handlePickup} disabled={!contentOk || !sizeOk}>
            {language === "ar" ? "تأكيد الاستلام" : "Confirmer pickup"}
          </Button>
        </Card>
      )}

      {/* Secret code for sender */}
      {role === "sender" && unlocked && !closed && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">
            {language === "ar" ? "رمز التسليم السري" : "Code secret de livraison"}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === "ar"
              ? "مرئي فقط للمرسل. لا تشاركه قبل التسليم النهائي."
              : "Visible uniquement à l'expéditeur. Ne pas partager avant la remise finale."}
          </p>
          <p className="text-lg font-black tracking-wider">{deliveryCode || "MAAK-XXXX-XX"}</p>
        </Card>
      )}

      {/* Delivery code entry (traveler) */}
      {canTravelerDeliver && (
        <Card className="maak-card p-4 space-y-3">
          <p className="text-sm font-semibold">
            {language === "ar" ? "تأكيد التسليم" : "Valider la livraison"}
          </p>
          <Input
            placeholder="MAAK-1234-AB"
            value={deliveryCodeInput}
            onChange={(e) => setDeliveryCodeInput(e.target.value.toUpperCase())}
          />
          <Button className="w-full maak-primary-btn" onClick={handleVerifyDeliveryCode}>
            {language === "ar" ? "التحقق من الرمز" : "Vérifier le code"}
          </Button>
        </Card>
      )}

      {/* Closed */}
      {closed && (
        <Card className="maak-card-soft p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">
            {language === "ar" ? "الصفقة مغلقة ✅" : "Deal clôturé ✅"}
          </p>
        </Card>
      )}

      {/* Actions footer */}
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
          <ShieldAlert className="h-4 w-4 mr-2" />
          {language === "ar" ? "إبلاغ" : "Signaler"}
        </Button>
        {closed && (
          <Button variant="outline" className="w-full" onClick={() => navigate("/profile/ratings")}>
            {language === "ar" ? "تقييم" : "Laisser un avis"}
          </Button>
        )}
      </div>
    </div>
  );
}
