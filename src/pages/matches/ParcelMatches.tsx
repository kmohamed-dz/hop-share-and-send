import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Info, Route, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeTripParcelScore, type MatchScore } from "@/lib/matching";
import { toast } from "sonner";

type TripWithScore = Tables<"trips"> & { score: MatchScore };

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
    Promise.all([
      supabase.from("parcel_requests").select("*").eq("id", parcelId).maybeSingle(),
      supabase.from("trips").select("*").eq("status", "active"),
    ]).then(([parcelRes, tripsRes]) => {
      const p = parcelRes.data;
      setParcel(p);
      if (p && tripsRes.data) {
        const scored = tripsRes.data
          .map((t) => ({ ...t, score: computeTripParcelScore(t, p) }))
          .filter((t) => t.score.total > 0)
          .sort((a, b) => b.score.total - a.score.total);
        setMatches(scored);
      }
      setLoading(false);
    });
  }, [parcelId]);

  const proposeDeal = async (trip: Tables<"trips">) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !parcelId || !parcel) return;

    const existing = await supabase.from("deals").select("id").eq("trip_id", trip.id).eq("parcel_request_id", parcelId).maybeSingle();
    if (existing.data?.id) {
      navigate(`/deals/${existing.data.id}`);
      return;
    }

    const { data, error } = await supabase
      .from("deals")
      .insert({
        trip_id: trip.id,
        parcel_request_id: parcelId,
        traveler_user_id: trip.user_id,
        owner_user_id: auth.user.id,
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
          <h1 className="maak-section-title">Trajets compatibles</h1>
        </div>
        <button onClick={() => setShowInfo((v) => !v)} className="p-1"><Info className="h-5 w-5 text-primary" /></button>
      </div>

      {showInfo && <Card className="maak-card-soft p-3 mb-3 text-sm text-muted-foreground">MAAK propose automatiquement les meilleurs matchs selon départ/arrivée, dates et compatibilité colis/capacité.</Card>}

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
            {safetyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Contact débloqué uniquement après acceptation</li>
              <li>Vérifiez le colis à la remise</li>
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
          {matches.map((m) => (
            <Card key={m.id} className="maak-card p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{m.origin_wilaya} → {m.destination_wilaya}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs font-bold text-primary">{m.score.total}/100</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Clock className="h-3 w-3" />
                {new Date(m.departure_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <ScoreBadge ok={m.score.originMatch} label="Origine" />
                <ScoreBadge ok={m.score.destinationMatch} label="Destination" />
                <ScoreBadge ok={m.score.timeMatch} label="Date" />
                <ScoreBadge ok={m.score.categoryMatch} label="Catégorie" />
              </div>

              <Button className="w-full" onClick={() => proposeDeal(m)}>Proposer ce match</Button>
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
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}
