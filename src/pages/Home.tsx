import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Route, Package, Search, MapPin, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";

export default function Home() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("trips").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(5),
      supabase.from("parcel_requests").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(5),
    ]).then(([t, p]) => {
      setTrips(t.data ?? []);
      setParcels(p.data ?? []);
    });
  }, []);

  return (
    <div className="px-4 safe-top">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold"><span className="text-primary">MAAK</span></h1>
        <p className="text-muted-foreground text-sm mt-1">Mobilité & colis entre villes</p>
      </div>

      {/* Search */}
      <button onClick={() => navigate("/search")} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted mb-6">
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Rechercher un trajet ou colis...</span>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20" onClick={() => navigate("/trips/create")}>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Route className="h-5 w-5 text-primary" />
          </div>
          <p className="font-semibold text-sm">Publier un trajet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Proposez votre voyage</p>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary/20" onClick={() => navigate("/parcels/create")}>
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
            <Package className="h-5 w-5 text-secondary" />
          </div>
          <p className="font-semibold text-sm">Envoyer un colis</p>
          <p className="text-xs text-muted-foreground mt-0.5">Trouvez un transporteur</p>
        </Card>
      </div>

      {/* Active Trips */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Trajets disponibles</h2>
          <button onClick={() => navigate("/browse/trips")} className="text-xs text-primary font-medium flex items-center gap-0.5">
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun trajet disponible</p>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => (
              <Card key={trip.id} className="p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/trips/${trip.id}/matches`)}>
                <div className="flex items-center gap-2 mb-1">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(trip.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  {trip.accepted_categories && trip.accepted_categories.length > 0 && (
                    <span>{trip.accepted_categories.length} catégorie(s)</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Active Parcels */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Colis à envoyer</h2>
          <button onClick={() => navigate("/browse/parcels")} className="text-xs text-secondary font-medium flex items-center gap-0.5">
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {parcels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune demande de colis</p>
        ) : (
          <div className="space-y-2">
            {parcels.map((parcel) => {
              const cat = PARCEL_CATEGORIES.find((c) => c.id === parcel.category);
              return (
                <Card key={parcel.id} className="p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/parcels/${parcel.id}/matches`)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-secondary" />
                      <span className="font-medium text-sm">{parcel.origin_wilaya} → {parcel.destination_wilaya}</span>
                    </div>
                    {parcel.reward_dzd && parcel.reward_dzd > 0 && (
                      <span className="text-xs font-bold text-primary">{parcel.reward_dzd} DZD</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(parcel.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    {cat && <span>{cat.label}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
