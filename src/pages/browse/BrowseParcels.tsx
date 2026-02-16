import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PARCEL_CATEGORIES } from "@/data/wilayas";

export default function BrowseParcels() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<Tables<"parcel_requests">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("parcel_requests").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => {
      setParcels(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Colis à envoyer</h1>
      </div>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Chargement...</p>
      ) : parcels.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucune demande de colis</p>
      ) : (
        <div className="space-y-2">
          {parcels.map((parcel) => {
            const cat = PARCEL_CATEGORIES.find((c) => c.id === parcel.category);
            return (
              <Card key={parcel.id} className="p-3.5 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/parcels/${parcel.id}/matches`)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-secondary" />
                    <span className="font-semibold text-sm">{parcel.origin_wilaya} → {parcel.destination_wilaya}</span>
                  </div>
                  {parcel.reward_dzd && parcel.reward_dzd > 0 && (
                    <span className="text-xs font-bold text-primary">{parcel.reward_dzd} DZD</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(parcel.date_window_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(parcel.date_window_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                  {cat && <span>{cat.label}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
