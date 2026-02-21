import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Route, Star, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { ACTIVE_PARCEL_STATUSES } from "@/lib/marketplace";
import { toast } from "sonner";

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { language } = useAppLanguage();

  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [travelerProfile, setTravelerProfile] = useState<Tables<"profiles"> | null>(null);
  const [myParcels, setMyParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [showRequest, setShowRequest] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!tripId) return;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      setMyUserId(userId);

      const { data: tripData, error: tripError } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
      if (tripError || !tripData) {
        toast.error(language === "ar" ? "الرحلة غير متاحة" : "Trajet indisponible.");
        navigate("/browse/trips");
        return;
      }
      setTrip(tripData);

      const [profileRes, parcelsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", tripData.user_id).maybeSingle(),
        userId
          ? supabase
              .from("parcel_requests")
              .select("*")
              .eq("user_id", userId)
              .in("status", [...ACTIVE_PARCEL_STATUSES])
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setTravelerProfile(profileRes.data ?? null);
      setMyParcels(parcelsRes.data ?? []);
    })();
  }, [tripId, language, navigate]);

  const handleRequest = async () => {
    if (!tripId || !trip || !myUserId) return;

    if (trip.user_id === myUserId) {
      toast.error(language === "ar" ? "لا يمكنك طلب رحلتك الخاصة" : "Vous ne pouvez pas demander votre propre trajet.");
      return;
    }

    if (!selectedParcelId) {
      toast.error(language === "ar" ? "اختر طردًا" : "Sélectionnez un colis.");
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase.rpc("propose_deal" as never, {
      p_parcel_request_id: selectedParcelId,
      p_trip_id: tripId,
    } as never);

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    const payload = data as { id?: string } | { id?: string }[] | null;
    const dealId = Array.isArray(payload) ? payload[0]?.id : payload?.id;

    if (!dealId) {
      toast.error(language === "ar" ? "فشل إنشاء الصفقة" : "Impossible de créer le deal.");
      return;
    }

    toast.success(language === "ar" ? "تم إنشاء الطلب" : "Demande envoyée : statut proposé.");
    navigate(`/deals/${dealId}`);
  };

  if (!trip) {
    return (
      <div className="mobile-page">
        <p className="text-sm text-muted-foreground">
          {language === "ar" ? "جار التحميل..." : "Chargement..."}
        </p>
      </div>
    );
  }

  const isOwnTrip = myUserId === trip.user_id;
  const formattedDate = new Date(trip.departure_date).toLocaleDateString(language === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="maak-section-title">{language === "ar" ? "تفاصيل الرحلة" : "Détail du trajet"}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="maak-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <span className="font-bold">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              {language === "ar"
                ? "مرونة في التاريخ ممكنة حسب الاتفاق"
                : "Date flexible possible selon accord entre expéditeur et voyageur."}
            </div>
            {trip.capacity_note && <p className="text-sm text-muted-foreground">{trip.capacity_note}</p>}
            {trip.accepted_categories && trip.accepted_categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {trip.accepted_categories.map((c) => {
                  const cat = PARCEL_CATEGORIES.find((p) => p.id === c);
                  return (
                    <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {cat?.label ?? c}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="maak-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">{travelerProfile?.name || (language === "ar" ? "ناقل" : "Transporteur")}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>
                    {travelerProfile?.rating_avg
                      ? `${Number(travelerProfile.rating_avg).toFixed(1)} (${travelerProfile.rating_count})`
                      : language === "ar"
                        ? "جديد"
                        : "Nouveau"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!isOwnTrip && !showRequest && (
            <Card className="maak-card p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "ابدأ بطلب نقل: سيتم إنشاء صفقة بحالة مقترحة."
                  : "Commencez par une demande de transport: un deal sera créé avec le statut proposé."}
              </p>
              <Button className="w-full maak-primary-btn" onClick={() => setShowRequest(true)}>
                {language === "ar" ? "طلب النقل" : "Demander transport"}
              </Button>
            </Card>
          )}

          {isOwnTrip && (
            <Card className="maak-card p-5">
              <p className="text-sm text-muted-foreground">{language === "ar" ? "هذه رحلتك." : "C'est votre trajet."}</p>
            </Card>
          )}

          {showRequest && (
            <Card className="maak-card p-5 space-y-4">
              <p className="text-sm font-semibold">{language === "ar" ? "إرسال الطلب" : "Demander transport"}</p>

              <div className="space-y-2">
                <Label>{language === "ar" ? "اختر طردًا" : "Sélectionner un colis"} *</Label>
                {myParcels.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {language === "ar" ? "ليس لديك طرود نشطة." : "Vous n'avez pas de colis actif."}
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/parcels/create")}>
                      {language === "ar" ? "إنشاء طرد" : "Créer un colis"}
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedParcelId} onValueChange={setSelectedParcelId}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "ar" ? "اختر..." : "Choisir..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {myParcels.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.origin_wilaya} → {p.destination_wilaya} ({p.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button className="w-full maak-primary-btn" onClick={handleRequest} disabled={submitting || !selectedParcelId}>
                {submitting
                  ? language === "ar"
                    ? "جارٍ الإرسال..."
                    : "Envoi..."
                  : language === "ar"
                    ? "إرسال الطلب"
                    : "Demander transport"}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
