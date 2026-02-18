import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Route, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { syncMarketplaceExpirations } from "@/lib/marketplace";

export default function BrowseTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      await syncMarketplaceExpirations();
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("status", "active")
        .gte("departure_date", nowIso)
        .order("departure_date", { ascending: true });
      setTrips(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Trajets disponibles</h1>
      </div>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Chargement...</p>
      ) : trips.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucun trajet disponible</p>
      ) : (
        <div className="space-y-2">
          {trips.map((trip) => (
            <Card key={trip.id} className="p-3.5 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/trips/${trip.id}/matches`)}>
              <div className="flex items-center gap-2 mb-1">
                <Route className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(trip.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              {trip.accepted_categories && trip.accepted_categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {trip.accepted_categories.map((c) => (
                    <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">{c}</span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
