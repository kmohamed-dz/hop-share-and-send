import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type DealExt = Tables<"deals">;

export default function Messages() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealExt[]>([]);

  useEffect(() => {
    supabase.from("deals").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
      setDeals((data as DealExt[]) ?? []);
    });
  }, []);

  return (
    <div className="mobile-page">
      <div className="pb-4">
        <h1 className="maak-section-title">Messages</h1>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">Aucun deal accepté</p>
          <p className="text-sm text-muted-foreground mt-1">Le chat est activé après acceptation mutuelle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <Card key={deal.id} className="maak-card p-4 cursor-pointer" onClick={() => navigate(`/messages/${deal.id}`)}>
              <p className="text-sm font-semibold">Deal {deal.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">Statut: {deal.status}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
