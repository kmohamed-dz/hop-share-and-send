import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export default function ProfileRatings() {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Tables<"ratings">[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: r } = await supabase.from("ratings").select("*").eq("to_user_id", data.user.id).order("created_at", { ascending: false });
      setRatings(r ?? []);
    });
  }, []);

  const avg = useMemo(() => ratings.length ? (ratings.reduce((a, r) => a + r.stars, 0) / ratings.length) : 0, [ratings]);

  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Mes évaluations</h1>
      </div>

      <Card className="maak-card p-4">
        <p className="text-sm text-muted-foreground">Score moyen</p>
        <p className="text-3xl font-black flex items-center gap-2"><Star className="h-6 w-6 text-amber-500 fill-amber-500" />{avg.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">({ratings.length} avis)</span></p>
      </Card>

      <div className="space-y-2">
        {ratings.map((r) => (
          <Card key={r.id} className="maak-card p-4">
            <p className="text-sm font-semibold">{Array.from({ length: r.stars }).map(() => "★").join("")}</p>
            <p className="text-sm text-muted-foreground">{r.comment || "Sans commentaire"}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
