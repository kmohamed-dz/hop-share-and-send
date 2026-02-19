import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Route, Package, X, Clock, CheckCircle2, Handshake } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppLanguage } from "@/contexts/LanguageContext";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";

function TripCard({ trip, onCancel, lang }: { trip: Tables<"trips">; onCancel: (id: string) => void; lang: string }) {
  const isActive = trip.status === "active";
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Route className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
        </div>
        {isActive ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
            {lang === "ar" ? "نشط" : "Actif"}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {trip.status === "cancelled" ? (lang === "ar" ? "ملغى" : "Annulé") : trip.status === "expired" ? (lang === "ar" ? "منتهي" : "Expiré") : (lang === "ar" ? "منتهي" : "Terminé")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        <Clock className="h-3 w-3 inline mr-1" />
        {new Date(trip.departure_date).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      {isActive && (
        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => onCancel(trip.id)}>
          <X className="h-3.5 w-3.5 mr-1" /> {lang === "ar" ? "إلغاء" : "Annuler"}
        </Button>
      )}
    </Card>
  );
}

function ParcelCard({ parcel, onCancel, lang }: { parcel: Tables<"parcel_requests">; onCancel: (id: string) => void; lang: string }) {
  const isActive = parcel.status === "active";
  const cat = PARCEL_CATEGORIES.find((p) => p.id === parcel.category);
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 text-secondary" />
          <span className="font-semibold text-sm">{parcel.origin_wilaya} → {parcel.destination_wilaya}</span>
        </div>
        {isActive ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
            {lang === "ar" ? "نشط" : "Actif"}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {parcel.status === "cancelled" ? (lang === "ar" ? "ملغى" : "Annulé") : (lang === "ar" ? "منتهي" : "Expiré")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Clock className="h-3 w-3" />
        {new Date(parcel.date_window_start).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" })}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {cat && <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{cat.label}</span>}
        {parcel.reward_dzd && parcel.reward_dzd > 0 && <span className="text-xs font-semibold text-primary">{parcel.reward_dzd} DZD</span>}
      </div>
      {isActive && (
        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => onCancel(parcel.id)}>
          <X className="h-3.5 w-3.5 mr-1" /> {lang === "ar" ? "إلغاء" : "Annuler"}
        </Button>
      )}
    </Card>
  );
}

function DealCard({ deal, myUserId, lang, navigate }: { deal: Tables<"deals">; myUserId: string; lang: string; navigate: (path: string) => void }) {
  const isSender = deal.owner_user_id === myUserId;
  const roleLabel = isSender ? (lang === "ar" ? "مرسل" : "Expéditeur") : (lang === "ar" ? "ناقل" : "Transporteur");
  const closed = ["closed", "delivered"].includes(deal.status);

  return (
    <Card className="p-3.5 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/deals/${deal.id}`)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-1">
          <Handshake className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{roleLabel}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${closed ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>
          {deal.status}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        <Clock className="h-3 w-3 inline mr-1" />
        {new Date(deal.created_at).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" })}
      </p>
    </Card>
  );
}

export default function Activity() {
  const { toast } = useToast();
  const { language } = useAppLanguage();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [deals, setDeals] = useState<Tables<"deals">[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setMyUserId(user.id);

    const [tripsRes, parcelsRes, dealsRes] = await Promise.all([
      supabase.from("trips").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("parcel_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("deals").select("*").or(`owner_user_id.eq.${user.id},traveler_user_id.eq.${user.id}`).order("created_at", { ascending: false }),
    ]);

    setTrips(tripsRes.data ?? []);
    setParcels(parcelsRes.data ?? []);
    setDeals(dealsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void fetchData(); }, []);

  const cancelTrip = async (id: string) => {
    await supabase.from("trips").update({ status: "cancelled" }).eq("id", id);
    toast({ title: language === "ar" ? "تم إلغاء الرحلة" : "Trajet annulé" });
    void fetchData();
  };

  const cancelParcel = async (id: string) => {
    await supabase.from("parcel_requests").update({ status: "cancelled" }).eq("id", id);
    toast({ title: language === "ar" ? "تم إلغاء الطلب" : "Demande annulée" });
    void fetchData();
  };

  const activeTrips = trips.filter((t) => t.status === "active");
  const historyTrips = trips.filter((t) => t.status !== "active");
  const activeParcels = parcels.filter((p) => p.status === "active");
  const historyParcels = parcels.filter((p) => p.status !== "active");
  const activeDeals = deals.filter((d) => !["closed", "delivered"].includes(d.status));
  const historyDeals = deals.filter((d) => ["closed", "delivered"].includes(d.status));

  return (
    <div className="px-4 safe-top">
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold">{language === "ar" ? "نشاطي" : "Mon activité"}</h1>
      </div>

      <Tabs defaultValue="deals" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="deals" className="flex-1 gap-1.5">
            <Handshake className="h-4 w-4" /> {language === "ar" ? "صفقات" : "Deals"}
          </TabsTrigger>
          <TabsTrigger value="trips" className="flex-1 gap-1.5">
            <Route className="h-4 w-4" /> {language === "ar" ? "رحلات" : "Trajets"}
          </TabsTrigger>
          <TabsTrigger value="parcels" className="flex-1 gap-1.5">
            <Package className="h-4 w-4" /> {language === "ar" ? "طرود" : "Colis"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{language === "ar" ? "جار التحميل..." : "Chargement..."}</p>
          ) : deals.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد صفقات" : "Aucun deal"}</p>
            </div>
          ) : (
            <>
              {activeDeals.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {language === "ar" ? `نشطة (${activeDeals.length})` : `Actifs (${activeDeals.length})`}
                  </p>
                  {activeDeals.map((d) => <DealCard key={d.id} deal={d} myUserId={myUserId} lang={language} navigate={navigate} />)}
                </>
              )}
              {historyDeals.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                    {language === "ar" ? "السجل" : "Historique"}
                  </p>
                  {historyDeals.map((d) => <DealCard key={d.id} deal={d} myUserId={myUserId} lang={language} navigate={navigate} />)}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{language === "ar" ? "جار التحميل..." : "Chargement..."}</p>
          ) : activeTrips.length === 0 && historyTrips.length === 0 ? (
            <div className="text-center py-12">
              <Route className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد رحلات" : "Aucun trajet publié"}</p>
            </div>
          ) : (
            <>
              {activeTrips.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{language === "ar" ? `نشطة (${activeTrips.length})` : `Actifs (${activeTrips.length})`}</p>
                  {activeTrips.map((t) => <TripCard key={t.id} trip={t} onCancel={cancelTrip} lang={language} />)}
                </>
              )}
              {historyTrips.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">{language === "ar" ? "السجل" : "Historique"}</p>
                  {historyTrips.map((t) => <TripCard key={t.id} trip={t} onCancel={cancelTrip} lang={language} />)}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="parcels" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{language === "ar" ? "جار التحميل..." : "Chargement..."}</p>
          ) : activeParcels.length === 0 && historyParcels.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد طرود" : "Aucune demande de colis"}</p>
            </div>
          ) : (
            <>
              {activeParcels.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{language === "ar" ? `نشطة (${activeParcels.length})` : `Actives (${activeParcels.length})`}</p>
                  {activeParcels.map((p) => <ParcelCard key={p.id} parcel={p} onCancel={cancelParcel} lang={language} />)}
                </>
              )}
              {historyParcels.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">{language === "ar" ? "السجل" : "Historique"}</p>
                  {historyParcels.map((p) => <ParcelCard key={p.id} parcel={p} onCancel={cancelParcel} lang={language} />)}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
