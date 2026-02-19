import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Route, Star, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { currentUserHasOpenDeal } from "@/lib/marketplace";
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
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!tripId) return;

      const { data: authData } = await supabase.auth.getUser();
      setMyUserId(authData.user?.id ?? null);

      const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
      setTrip(tripData);

      if (tripData) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", tripData.user_id)
          .maybeSingle();
        setTravelerProfile(profile);
      }

      if (authData.user) {
        const { data: parcels } = await supabase
          .from("parcel_requests")
          .select("*")
          .eq("user_id", authData.user.id)
          .eq("status", "active");
        setMyParcels(parcels ?? []);
      }
    })();
  }, [tripId]);

  const handleRequest = async () => {
    if (!tripId || !trip || !myUserId) return;

    if (trip.user_id === myUserId) {
      toast.error(language === "ar" ? "لا يمكنك طلب رحلتك الخاصة" : "Vous ne pouvez pas demander votre propre trajet.");
      return;
    }

    const hasOpen = await currentUserHasOpenDeal();
    if (hasOpen) {
      toast.error(
        language === "ar"
          ? "لديك معاملة نشطة. أكملها أو ألغها أولاً."
          : "Vous avez une transaction active. Terminez-la ou annulez-la avant d'en créer une nouvelle."
      );
      return;
    }

    if (!selectedParcelId) {
      toast.error(language === "ar" ? "اختر طردًا" : "Sélectionnez un colis.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("deals").insert({
      trip_id: tripId,
      parcel_request_id: selectedParcelId,
      owner_user_id: myUserId,
      traveler_user_id: trip.user_id,
      status: "proposed",
      message: message.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(language === "ar" ? "تم إرسال الطلب" : "Demande envoyée !");
    navigate("/activity");
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

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">{language === "ar" ? "تفاصيل الرحلة" : "Détail du trajet"}</h1>
      </div>

      {/* Route card */}
      <Card className="maak-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <span className="font-bold">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {new Date(trip.departure_date).toLocaleDateString(language === "ar" ? "ar-DZ" : "fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </div>
        {trip.capacity_note && (
          <p className="text-sm text-muted-foreground">{trip.capacity_note}</p>
        )}
        {trip.accepted_categories && trip.accepted_categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trip.accepted_categories.map((c) => {
              const cat = PARCEL_CATEGORIES.find((p) => p.id === c);
              return <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{cat?.label ?? c}</span>;
            })}
          </div>
        )}
      </Card>

      {/* Traveler profile */}
      <Card className="maak-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">{travelerProfile?.name || (language === "ar" ? "ناقل" : "Transporteur")}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span>{travelerProfile?.rating_avg ? `${Number(travelerProfile.rating_avg).toFixed(1)} (${travelerProfile.rating_count})` : (language === "ar" ? "جديد" : "Nouveau")}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Request CTA */}
      {!isOwnTrip && !showRequest && (
        <Button className="w-full maak-primary-btn" onClick={() => setShowRequest(true)}>
          {language === "ar" ? "طلب النقل" : "Demander le transport"}
        </Button>
      )}

      {isOwnTrip && (
        <Card className="maak-card p-4">
          <p className="text-sm text-muted-foreground">
            {language === "ar" ? "هذه رحلتك." : "C'est votre trajet."}
          </p>
        </Card>
      )}

      {/* Request form */}
      {showRequest && (
        <Card className="maak-card p-4 space-y-4">
          <p className="text-sm font-semibold">
            {language === "ar" ? "إرسال طلب" : "Envoyer une demande"}
          </p>

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
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر..." : "Choisir..."} /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>{language === "ar" ? "رسالة (اختياري)" : "Message (optionnel)"}</Label>
            <Textarea
              placeholder={language === "ar" ? "أنا مرن بشأن التاريخ..." : "Je suis flexible sur la date/heure."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
            />
          </div>

          <Button
            className="w-full maak-primary-btn"
            onClick={handleRequest}
            disabled={submitting || !selectedParcelId}
          >
            {submitting
              ? (language === "ar" ? "جارٍ الإرسال..." : "Envoi...")
              : (language === "ar" ? "إرسال الطلب" : "Envoyer la demande")}
          </Button>
        </Card>
      )}
    </div>
  );
}
