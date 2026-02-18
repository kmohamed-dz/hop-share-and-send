import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Route, Package, X, Clock, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";

function TripCard({ trip, onCancel }: { trip: Tables<"trips">; onCancel: (id: string) => void }) {
  const isActive = trip.status === "active";
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Route className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
        </div>
        {isActive ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Actif</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {trip.status === "cancelled" ? "Annulé" : trip.status === "expired" ? "Expiré" : "Terminé"}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        <Clock className="h-3 w-3 inline mr-1" />
        {new Date(trip.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      {trip.accepted_categories && trip.accepted_categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {trip.accepted_categories.map((c) => {
            const cat = PARCEL_CATEGORIES.find((p) => p.id === c);
            return <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">{cat?.label ?? c}</span>;
          })}
        </div>
      )}
      {isActive && (
        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => onCancel(trip.id)}>
          <X className="h-3.5 w-3.5 mr-1" /> Annuler
        </Button>
      )}
    </Card>
  );
}

function ParcelCard({ parcel, onCancel }: { parcel: Tables<"parcel_requests">; onCancel: (id: string) => void }) {
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Actif</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {parcel.status === "cancelled" ? "Annulé" : parcel.status === "expired" ? "Expiré" : "Terminé"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Clock className="h-3 w-3" />
        {new Date(parcel.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {cat && <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{cat.label}</span>}
        {parcel.reward_dzd && parcel.reward_dzd > 0 && <span className="text-xs font-semibold text-primary">{parcel.reward_dzd} DZD</span>}
      </div>
      {isActive && (
        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => onCancel(parcel.id)}>
          <X className="h-3.5 w-3.5 mr-1" /> Annuler
        </Button>
      )}
    </Card>
  );
}

export default function Activity() {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [tripsRes, parcelsRes] = await Promise.all([
      supabase.from("trips").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("parcel_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setTrips(tripsRes.data ?? []);
    setParcels(parcelsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const cancelTrip = async (id: string) => {
    await supabase.from("trips").update({ status: "cancelled" }).eq("id", id);
    toast({ title: "Trajet annulé" });
    fetchData();
  };

  const cancelParcel = async (id: string) => {
    await supabase.from("parcel_requests").update({ status: "cancelled" }).eq("id", id);
    toast({ title: "Demande annulée" });
    fetchData();
  };

  const activeTrips = trips.filter((t) => t.status === "active");
  const historyTrips = trips.filter((t) => t.status !== "active");
  const activeParcels = parcels.filter((p) => p.status === "active");
  const historyParcels = parcels.filter((p) => p.status !== "active");

  return (
    <div className="px-4 safe-top">
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold">Mon activité</h1>
      </div>

      <Tabs defaultValue="trips" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="trips" className="flex-1 gap-1.5">
            <Route className="h-4 w-4" /> Trajets
          </TabsTrigger>
          <TabsTrigger value="parcels" className="flex-1 gap-1.5">
            <Package className="h-4 w-4" /> Colis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : activeTrips.length === 0 && historyTrips.length === 0 ? (
            <div className="text-center py-12">
              <Route className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun trajet publié</p>
            </div>
          ) : (
            <>
              {activeTrips.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actifs ({activeTrips.length})</p>
                  {activeTrips.map((t) => <TripCard key={t.id} trip={t} onCancel={cancelTrip} />)}
                </>
              )}
              {historyTrips.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">Historique</p>
                  {historyTrips.map((t) => <TripCard key={t.id} trip={t} onCancel={cancelTrip} />)}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="parcels" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : activeParcels.length === 0 && historyParcels.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune demande de colis</p>
            </div>
          ) : (
            <>
              {activeParcels.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actives ({activeParcels.length})</p>
                  {activeParcels.map((p) => <ParcelCard key={p.id} parcel={p} onCancel={cancelParcel} />)}
                </>
              )}
              {historyParcels.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">Historique</p>
                  {historyParcels.map((p) => <ParcelCard key={p.id} parcel={p} onCancel={cancelParcel} />)}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
