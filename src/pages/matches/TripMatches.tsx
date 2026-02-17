import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Package, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeTripParcelScore, type MatchScore } from "@/lib/matching";
import { PARCEL_CATEGORIES } from "@/data/wilayas";
import { toast } from "sonner";

type ParcelWithScore = Tables<"parcel_requests"> & { score: MatchScore };

export default function TripMatches() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Tables<"trips"> | null>(null);
  const [matches, setMatches] = useState<ParcelWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
      supabase.from("parcel_requests").select("*").eq("status", "active"),
    ]).then(([tripRes, parcelsRes]) => {
      const t = tripRes.data;
      setTrip(t);
      if (t && parcelsRes.data) {
        const scored = parcelsRes.data
          .map((p) => ({ ...p, score: computeTripParcelScore(t, p) }))
          .filter((p) => p.score.total > 0)
          .sort((a, b) => b.score.total - a.score.total);
        setMatches(scored);
      }
      setLoading(false);
    });
  }, [tripId]);

  const proposeDeal = async (parcel: Tables<"parcel_requests">) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !tripId) return;

    const existing = await supabase.from("deals").select("id").eq("trip_id", tripId).eq("parcel_request_id", parcel.id).maybeSingle();
    if (existing.data?.id) {
      navigate(`/deals/${existing.data.id}`);
      return;
    }

    const { data, error } = await supabase
      .from("deals")
      .insert({
        trip_id: tripId,
        parcel_request_id: parcel.id,
        traveler_user_id: auth.user.id,
        owner_user_id: parcel.user_id,
        status: "proposed",
      })
      .select("id")
      .single();

    if (error) toast.error(error.message);
    else navigate(`/deals/${data.id}`);
  };

  return (
    <div className="mobile-page">
      <div className="mobile-header justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="maak-section-title">Colis compatibles</h1>
        </div>
        <button onClick={() => setShowInfo((v) => !v)} className="p-1"><Info className="h-5 w-5 text-primary" /></button>
      </div>

      {showInfo && (
        <Card className="maak-card-soft p-3 mb-3 text-sm text-muted-foreground">
          MAAK propose automatiquement les meilleurs matchs selon le départ, l’arrivée, le chevauchement des dates et la compatibilité catégorie/capacité.
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

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Recherche de correspondances...</p>
      ) : matches.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucun colis compatible trouvé</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const cat = PARCEL_CATEGORIES.find((c) => c.id === m.category);
            return (
              <Card key={m.id} className="maak-card p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-secondary" />
                    <span className="font-semibold text-sm">{m.origin_wilaya} → {m.destination_wilaya}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-bold text-primary">{m.score.total}/100</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(m.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  {cat && <span>{cat.label}</span>}
                  {m.reward_dzd && m.reward_dzd > 0 && <span className="font-semibold text-primary">{m.reward_dzd} DZD</span>}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <ScoreBadge ok={m.score.originMatch} label="Origine" />
                  <ScoreBadge ok={m.score.destinationMatch} label="Destination" />
                  <ScoreBadge ok={m.score.timeMatch} label="Date" />
                  <ScoreBadge ok={m.score.categoryMatch} label="Catégorie" />
                </div>

                <Button className="w-full" onClick={() => proposeDeal(m)}>Proposer ce match</Button>
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
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}
