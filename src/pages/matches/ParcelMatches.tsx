import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Info, Route, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { syncMarketplaceExpirations } from "@/lib/marketplace";
import { computeTripParcelScore, type MatchScore } from "@/lib/matching";
import { toast } from "sonner";

type TripWithScore = Tables<"trips"> & { score: MatchScore };

type ProfilePublicRow = {
  rating_avg: number | null;
  user_id: string;
};

export default function ParcelMatches() {
  const { parcelId } = useParams<{ parcelId: string }>();
  const navigate = useNavigate();

  const [parcel, setParcel] = useState<Tables<"parcel_requests"> | null>(null);
  const [matches, setMatches] = useState<TripWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    if (!parcelId) return;

    void (async () => {
      setLoading(true);
      await syncMarketplaceExpirations();
      const nowIso = new Date().toISOString();

      const [parcelRes, tripsRes] = await Promise.all([
        supabase.from("parcel_requests").select("*").eq("id", parcelId).maybeSingle(),
        supabase.from("trips").select("*").eq("status", "active").gte("departure_date", nowIso),
      ]);

      const parcelData = parcelRes.data;
      const tripData = tripsRes.data ?? [];

      setParcel(parcelData ?? null);

      if (!parcelData || tripData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const resolvedTravelerIds = Array.from(
        new Set(tripData.map((trip) => (trip as Tables<"trips"> & { traveler_id?: string }).traveler_id ?? trip.user_id))
      ).filter((value): value is string => Boolean(value));
      const ratingsByUser = new Map<string, number>();

      if (resolvedTravelerIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profile_public" as never)
          .select("user_id,rating_avg")
          .in("user_id", resolvedTravelerIds);

        ((profileRows as ProfilePublicRow[] | null) ?? []).forEach((row) => {
          ratingsByUser.set(row.user_id, row.rating_avg ?? 3);
        });
      }

      const scored = tripData
        .map((trip) => ({
          ...trip,
          score: computeTripParcelScore(trip, parcelData, {
            reputationAvg:
              ratingsByUser.get((trip as Tables<"trips"> & { traveler_id?: string }).traveler_id ?? trip.user_id) ?? 3,
          }),
        }))
        .filter((trip) => trip.score.total > 0)
        .sort((a, b) => b.score.total - a.score.total);

      setMatches(scored);
      setLoading(false);
    })();
  }, [parcelId]);

  const proposeDeal = async (trip: Tables<"trips">) => {
    if (!parcelId) return;

    const { data, error } = await supabase.rpc("propose_deal" as never, {
      p_parcel_request_id: parcelId,
      p_trip_id: trip.id,
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
          <h1 className="maak-section-title">Trajets compatibles</h1>
        </div>
        <button onClick={() => setShowInfo((value) => !value)} className="p-1"><Info className="h-5 w-5 text-primary" /></button>
      </div>

      {showInfo && (
        <Card className="maak-card-soft p-3 mb-3 text-sm text-muted-foreground">
          Les correspondances sont pondérées (trajet, capacité, réputation et proximité de date). La date est flexible.
        </Card>
      )}

      {parcel && (
        <Card className="maak-card-soft p-3 mb-4">
          <p className="text-sm font-medium">Votre colis : {parcel.origin_wilaya} → {parcel.destination_wilaya}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(parcel.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
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
        <p className="text-center text-sm text-muted-foreground py-12">Aucun trajet compatible trouvé</p>
      ) : (
        <div className="space-y-3">
          {matches.map((trip) => (
            <Card key={trip.id} className="maak-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{trip.origin_wilaya} → {trip.destination_wilaya}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">{trip.score.total}/100</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(trip.departure_date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <ScoreBadge ok={trip.score.originMatch} label="Départ" />
                <ScoreBadge ok={trip.score.destinationMatch} label="Arrivée" />
                <ScoreBadge ok={trip.score.categoryMatch} label="Catégorie" />
                {trip.score.dateFlexible ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Date flexible
                  </span>
                ) : (
                  <ScoreBadge ok={true} label="Date alignée" />
                )}
              </div>

              <Button className="w-full" onClick={() => proposeDeal(trip)}>
                Proposer ce match
              </Button>
            </Card>
          ))}
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
