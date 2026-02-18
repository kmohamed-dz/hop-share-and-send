import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Bell,
  Zap,
  Car,
  Package,
  Shield,
  Star,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";

export default function Home() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Tables<"trips">[]>([]);
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);

  useEffect(() => {
    Promise.all([
      supabase
        .from("trips")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("parcel_requests")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([t, p]) => {
      setTrips(t.data ?? []);
      setParcels(p.data ?? []);
    });
  }, []);

  return (
    <div className="px-4 safe-top">
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-primary">MAAK</h1>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <button
        onClick={() => navigate("/search")}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border mb-6 shadow-sm"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          Ou voulez-vous envoyer votre colis ?
        </span>
      </button>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base">Actions rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="p-4 cursor-pointer border-0 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl transition-shadow"
            onClick={() => navigate("/trips/create")}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center mb-3">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-bold text-sm">Publier un trajet</p>
            <p className="text-xs text-primary-foreground/80 mt-0.5">
              Partagez vos frais
            </p>
          </Card>
          <Card
            className="p-4 cursor-pointer border border-primary/20 bg-card hover:shadow-md transition-shadow"
            onClick={() => navigate("/parcels/create")}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <p className="font-bold text-sm text-foreground">Envoyer un colis</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trouvez un transporteur
            </p>
          </Card>
        </div>
      </div>

      {/* Security Tip Banner */}
      <Card className="p-4 mb-6 bg-secondary border-0 text-secondary-foreground rounded-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">
              Conseil sécurité
            </span>
          </div>
          <p className="font-bold text-sm leading-snug">
            Vérifiez toujours l'identité{"\n"}du transporteur avant la remise
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => navigate("/processus/securite")}
              className="px-3 py-1.5 bg-primary-foreground text-secondary rounded-lg text-xs font-bold"
            >
              En savoir plus
            </button>
            <button
              onClick={() => navigate("/processus")}
              className="text-xs font-semibold underline underline-offset-2 opacity-90"
            >
              Comment ça marche ?
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10">
          <Shield className="h-24 w-24" />
        </div>
      </Card>

      {/* Nearby Trips */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Trajets a proximite</h2>
          <button
            onClick={() => navigate("/browse/trips")}
            className="text-xs text-primary font-semibold flex items-center gap-0.5"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {trips.length === 0 ? (
          <Card className="p-8">
            <p className="text-sm text-muted-foreground text-center">
              Aucun trajet disponible pour le moment
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-border"
                onClick={() => navigate(`/trips/${trip.id}/matches`)}
              >
                {/* User info row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Transporteur</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>Nouveau</span>
                      </div>
                    </div>
                  </div>
                  {trip.accepted_categories && trip.accepted_categories.length > 0 && (
                    <span className="text-xs font-bold text-primary">
                      {trip.accepted_categories.length} cat.
                    </span>
                  )}
                </div>

                {/* Route */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      <div className="w-0.5 h-6 bg-primary/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                          Depart
                        </p>
                        <p className="font-semibold text-sm">{trip.origin_wilaya}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                          Arrivee
                        </p>
                        <p className="font-semibold text-sm">
                          {trip.destination_wilaya}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(trip.departure_date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {trip.accepted_categories && trip.accepted_categories.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {trip.accepted_categories.slice(0, 2).join(", ")}
                    </span>
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
          <h2 className="font-bold text-base">Colis a envoyer</h2>
          <button
            onClick={() => navigate("/browse/parcels")}
            className="text-xs text-primary font-semibold flex items-center gap-0.5"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {parcels.length === 0 ? (
          <Card className="p-8">
            <p className="text-sm text-muted-foreground text-center">
              Aucune demande de colis
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {parcels.map((parcel) => {
              const cat = PARCEL_CATEGORIES.find((c) => c.id === parcel.category);
              return (
                <Card
                  key={parcel.id}
                  className="p-3.5 cursor-pointer hover:shadow-md transition-shadow border border-border"
                  onClick={() => navigate(`/parcels/${parcel.id}/matches`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">
                        {parcel.origin_wilaya} → {parcel.destination_wilaya}
                      </span>
                    </div>
                    {parcel.reward_dzd && parcel.reward_dzd > 0 && (
                      <span className="text-sm font-bold text-primary">
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
      </section>
    </div>
  );
}
