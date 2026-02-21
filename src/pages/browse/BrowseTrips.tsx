import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Route, Clock, AlertCircle, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { ACTIVE_PARCEL_STATUSES, syncMarketplaceExpirations, TRIP_ACTIVE_STATUSES } from "@/lib/marketplace";

export default function BrowseTrips() {
  const navigate = useNavigate();
  const { language } = useAppLanguage();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [myParcels, setMyParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      await syncMarketplaceExpirations();
      const nowIso = new Date().toISOString();

      const { data: authData } = await supabase.auth.getUser();

      const [tripsRes, parcelsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*")
          .in("status", [...TRIP_ACTIVE_STATUSES])
          .gte("departure_date", nowIso)
          .order("departure_date", { ascending: true }),
        authData.user
          ? supabase
              .from("parcel_requests")
              .select("*")
              .eq("user_id", authData.user.id)
              .in("status", [...ACTIVE_PARCEL_STATUSES])
          : Promise.resolve({ data: [] }),
      ]);

      setTrips(tripsRes.data ?? []);
      setMyParcels(parcelsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const hasDateMismatch = (trip: Tables<"trips">) => {
    if (myParcels.length === 0) return false;
    return !myParcels.some((p) => {
      const start = new Date(p.date_window_start);
      const end = new Date(p.date_window_end);
      const td = new Date(trip.departure_date);
      return td >= start && td <= end;
    });
  };

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">
          {language === "ar" ? "الرحلات المتاحة" : "Trajets disponibles"}
        </h1>
      </div>
      <Card className="maak-card-soft p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {language === "ar"
            ? "حتى مع اختلاف التاريخ، يمكنك طلب النقل إذا كنت مرنًا."
            : "Même avec une date différente, vous pouvez demander le transport si vous êtes flexible."}
        </div>
      </Card>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {language === "ar" ? "جار التحميل..." : "Chargement..."}
        </p>
      ) : trips.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {language === "ar" ? "لا توجد رحلات متاحة" : "Aucun trajet disponible"}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {trips.map((trip) => {
            const mismatch = hasDateMismatch(trip);
            return (
              <Card
                key={trip.id}
                className="maak-card p-4 cursor-pointer transition-colors hover:bg-muted/25"
                onClick={() => navigate(`/browse/trips/${trip.id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(trip.departure_date).toLocaleDateString(language === "ar" ? "ar-DZ" : "fr-FR", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                {trip.accepted_categories && trip.accepted_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trip.accepted_categories.slice(0, 4).map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded-full bg-muted">{c}</span>
                    ))}
                  </div>
                )}
                {mismatch && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {language === "ar"
                      ? "تواريخ مختلفة — ممكن إذا كنت مرنًا"
                      : "Dates différentes — demande possible si vous êtes flexible."}
                  </div>
                )}
                <Button className="mt-3 w-full" size="sm" variant="outline">
                  {language === "ar" ? "عرض التفاصيل" : "Voir le détail"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
