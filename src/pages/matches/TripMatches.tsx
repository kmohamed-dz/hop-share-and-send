import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Info, Package, Zap } from "lucide-react";

import { PARCEL_CATEGORIES } from "@/data/wilayas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ACTIVE_PARCEL_STATUSES, syncMarketplaceExpirations } from "@/lib/marketplace";
import { computeTripParcelScore, type MatchScore } from "@/lib/matching";
import { toast } from "sonner";

type ParcelWithScore = Tables<"parcel_requests"> & { score: MatchScore };

type ProfilePublicRow = {
  rating_avg: number | null;
  user_id: string;
};

export default function TripMatches() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [matches, setMatches] = useState<ParcelWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    if (!tripId) return;

    void (async () => {
      setLoading(true);
      await syncMarketplaceExpirations();
      const nowIso = new Date().toISOString();

      const [tripRes, parcelsRes] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
        supabase
          .from("parcel_requests")
          .select("*")
          .in("status", [...ACTIVE_PARCEL_STATUSES])
          .gte("date_window_end", nowIso),
      ]);

      const tripData = tripRes.data;
      const parcelsData = parcelsRes.data ?? [];
      setTrip(tripData ?? null);

      if (!tripData || parcelsData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const ownerIds = Array.from(
        new Set(parcelsData.map((entry) => (entry as Tables<"parcel_requests"> & { sender_id?: string }).sender_id ?? entry.user_id))
      ).filter((value): value is string => Boolean(value));
      const ratingsByUser = new Map<string, number>();

      if (ownerIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profile_public" as never)
          .select("user_id,rating_avg")
          .in("user_id", ownerIds);

        ((profileRows as ProfilePublicRow[] | null) ?? []).forEach((row) => {
          ratingsByUser.set(row.user_id, row.rating_avg ?? 3);
        });
      }

      const scored = parcelsData
        .map((parcel) => ({
          ...parcel,
          score: computeTripParcelScore(tripData, parcel, {
            reputationAvg:
              ratingsByUser.get(
                (parcel as Tables<"parcel_requests"> & { sender_id?: string }).sender_id ?? parcel.user_id
              ) ?? 3,
          }),
        }))
        .filter((parcel) => parcel.score.total > 0)
        .sort((a, b) => b.score.total - a.score.total);

      setMatches(scored);
      setLoading(false);
    })();
  }, [tripId]);

  const proposeDeal = async (parcel: Tables<"parcel_requests">) => {
    if (!tripId) return;

    const { data, error } = await supabase.rpc("propose_deal" as never, {
      p_parcel_request_id: parcel.id,
      p_trip_id: tripId,
    } as never);

    if (error) {
      toast.error(error.message);
      return;
    }

    const payload = data as { id?: string } | { id?: string }[] | null;
    const dealId = Array.isArray(payload) ? payload[0]?.id : payload?.id;

    if (!dealId) {
      toast.error("Impossible de créer le deal.");
      return;
    }

    navigate(`/deals/${dealId}`);
  };

  return (
    <div className="mobile-page">
      <div className="mobile-header justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="maak-section-title">Colis compatibles</h1>
        </div>
        <button onClick={() => setShowInfo((value) => !value)} className="p-1"><Info className="h-5 w-5 text-primary" /></button>
      </div>

      {showInfo && (
        <Card className="maak-card-soft p-3 mb-3 text-sm text-muted-foreground">
          Le score inclut départ, arrivée, capacité, réputation et proximité de date. La date reste flexible.
        </Card>
      )}

      {trip && (
        <Card className="maak-card-soft p-3 mb-4">
          <p className="text-sm font-medium">Votre trajet : {trip.origin_wilaya} → {trip.destination_wilaya}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(trip.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </Card>
      )}

      <Collapsible open={safetyOpen} onOpenChange={setSafetyOpen}>
        <Card className="maak-card p-3 mb-4">
          <CollapsibleTrigger className="w-full flex items-center justify-between text-left">
            <span className="text-sm font-semibold">Sécurité</span>
            {safetyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Contact et chat déverrouillés uniquement après acceptation mutuelle</li>
              <li>Code secret obligatoire pour clôturer la livraison</li>
            </ul>
            <div className="flex flex-col gap-1 text-sm">
              <Link className="text-primary font-medium hover:underline" to="/processus/remise">
                Voir le processus de remise
              </Link>
              <Link className="text-primary font-medium hover:underline" to="/processus/contact">
                Voir le protocole de contact
              </Link>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Recherche de correspondances...</p>
      ) : matches.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucun colis compatible trouvé</p>
      ) : (
        <div className="space-y-3">
          {matches.map((parcel) => {
            const category = PARCEL_CATEGORIES.find((entry) => entry.id === parcel.category);

            return (
              <Card key={parcel.id} className="maak-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-secondary" />
                    <span className="font-semibold text-sm">{parcel.origin_wilaya} → {parcel.destination_wilaya}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-bold text-primary">{parcel.score.total}/100</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(parcel.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                  {category && <span>{category.label}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <ScoreBadge ok={parcel.score.originMatch} label="Départ" />
                  <ScoreBadge ok={parcel.score.destinationMatch} label="Arrivée" />
                  <ScoreBadge ok={parcel.score.categoryMatch} label="Catégorie" />
                  {parcel.score.dateFlexible ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Date flexible
                    </span>
                  ) : (
                    <ScoreBadge ok={true} label="Date alignée" />
                  )}
                </div>

                <Button className="w-full" onClick={() => proposeDeal(parcel)}>
                  Proposer ce match
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}
