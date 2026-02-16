import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, Route, Package, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { WILAYAS, PARCEL_CATEGORIES } from "@/data/wilayas";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("trips");
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setTrips([]);
      setParcels([]);
      return;
    }

    setLoading(true);
    const q = query.toLowerCase();

    // Search matching wilayas
    const matchingWilayas = WILAYAS.filter((w) =>
      w.name.toLowerCase().includes(q)
    ).map((w) => w.name);

    const fetchData = async () => {
      if (tab === "trips") {
        let queryBuilder = supabase
          .from("trips")
          .select("*")
          .eq("status", "active")
          .order("departure_date", { ascending: true })
          .limit(20);

        if (matchingWilayas.length > 0) {
          // Search by origin or destination wilaya
          const { data } = await supabase
            .from("trips")
            .select("*")
            .eq("status", "active")
            .or(
              matchingWilayas
                .flatMap((w) => [
                  `origin_wilaya.ilike.%${w}%`,
                  `destination_wilaya.ilike.%${w}%`,
                ])
                .join(",")
            )
            .order("departure_date", { ascending: true })
            .limit(20);
          setTrips(data ?? []);
        } else {
          setTrips([]);
        }
      } else {
        if (matchingWilayas.length > 0) {
          const { data } = await supabase
            .from("parcel_requests")
            .select("*")
            .eq("status", "active")
            .or(
              matchingWilayas
                .flatMap((w) => [
                  `origin_wilaya.ilike.%${w}%`,
                  `destination_wilaya.ilike.%${w}%`,
                ])
                .join(",")
            )
            .order("created_at", { ascending: false })
            .limit(20);
          setParcels(data ?? []);
        } else {
          setParcels([]);
        }
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [query, tab]);

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une wilaya..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-muted border-0"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="trips" className="gap-1.5">
              <Route className="h-4 w-4" />
              Trajets
            </TabsTrigger>
            <TabsTrigger value="parcels" className="gap-1.5">
              <Package className="h-4 w-4" />
              Colis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="mt-4">
            {query.length < 2 ? (
              <div className="text-center py-12">
                <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tapez le nom d'une wilaya pour rechercher des trajets
                </p>
              </div>
            ) : loading ? (
              <p className="text-center text-sm text-muted-foreground py-12">Recherche...</p>
            ) : trips.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Aucun trajet trouve pour "{query}"
              </p>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => (
                  <Card
                    key={trip.id}
                    className="p-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/trips/${trip.id}/matches`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Route className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold text-sm">
                        {trip.origin_wilaya} → {trip.destination_wilaya}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(trip.departure_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="parcels" className="mt-4">
            {query.length < 2 ? (
              <div className="text-center py-12">
                <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tapez le nom d'une wilaya pour rechercher des colis
                </p>
              </div>
            ) : loading ? (
              <p className="text-center text-sm text-muted-foreground py-12">Recherche...</p>
            ) : parcels.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Aucun colis trouve pour "{query}"
              </p>
            ) : (
              <div className="space-y-2">
                {parcels.map((parcel) => {
                  const cat = PARCEL_CATEGORIES.find((c) => c.id === parcel.category);
                  return (
                    <Card
                      key={parcel.id}
                      className="p-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/parcels/${parcel.id}/matches`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-500" />
                          <span className="font-semibold text-sm">
                            {parcel.origin_wilaya} → {parcel.destination_wilaya}
                          </span>
                        </div>
                        {parcel.reward_dzd && parcel.reward_dzd > 0 && (
                          <span className="text-xs font-bold text-emerald-600">
                            {parcel.reward_dzd} DZD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(parcel.date_window_start).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          -{" "}
                          {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {cat && <span>{cat.label}</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
