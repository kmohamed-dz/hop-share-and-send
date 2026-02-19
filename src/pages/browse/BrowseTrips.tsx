import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Route, Clock, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { syncMarketplaceExpirations } from "@/lib/marketplace";

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
          .eq("status", "active")
          .gte("departure_date", nowIso)
          .order("departure_date", { ascending: true }),
        authData.user
          ? supabase
              .from("parcel_requests")
              .select("*")
              .eq("user_id", authData.user.id)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
      ]);

      setTrips(tripsRes.data ?? []);
      setMyParcels(parcelsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const hasDateMismatch = (trip: Tables<"trips">) => {
    if (myParcels.length === 0) return false;
    const tripDate = new Date(trip.departure_date).toDateString();
    return !myParcels.some((p) => {
      const start = new Date(p.date_window_start);
      const end = new Date(p.date_window_end);
      const td = new Date(trip.departure_date);
      return td >= start && td <= end;
    });
  };

  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">
          {language === "ar" ? "الرحلات المتاحة" : "Trajets disponibles"}
        </h1>
      </div>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {language === "ar" ? "جار التحميل..." : "Chargement..."}
        </p>
      ) : trips.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {language === "ar" ? "لا توجد رحلات متاحة" : "Aucun trajet disponible"}
        </p>
      ) : (
        <div className="space-y-2">
          {trips.map((trip) => {
            const mismatch = hasDateMismatch(trip);
            return (
              <Card
                key={trip.id}
                className="p-3.5 cursor-pointer hover:bg-muted/30"
                onClick={() => navigate(`/browse/trips/${trip.id}`)}
              >
                <div className="flex items-center gap-2 mb-1">
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
                    {trip.accepted_categories.map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">{c}</span>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
