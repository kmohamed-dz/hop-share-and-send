import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

type AdminStats = {
  deals_accepted_by_sender: number;
  deals_accepted_by_traveler: number;
  deals_closed: number;
  deals_delivered: number;
  deals_mutually_accepted: number;
  deals_pickup_confirmed: number;
  deals_proposed: number;
  total_auth_users: number;
  total_deals: number;
  total_messages: number;
  total_parcels: number;
  total_profiles: number;
  total_trips: number;
};

const EMPTY_STATS: AdminStats = {
  deals_accepted_by_sender: 0,
  deals_accepted_by_traveler: 0,
  deals_closed: 0,
  deals_delivered: 0,
  deals_mutually_accepted: 0,
  deals_pickup_confirmed: 0,
  deals_proposed: 0,
  total_auth_users: 0,
  total_deals: 0,
  total_messages: 0,
  total_parcels: 0,
  total_profiles: 0,
  total_trips: 0,
};

export default function AdminDashboard() {
  const { t } = useAppLanguage();
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_get_stats" as never);
      if (error) {
        console.error("[admin:stats]", error);
        return;
      }

      if (!data) return;
      const row = (Array.isArray(data) ? data[0] : data) as AdminStats | undefined;
      setStats(row ?? EMPTY_STATS);
    })();
  }, []);

  const cards = [
    { label: t("admin.stats.total_auth_users"), value: stats.total_auth_users },
    { label: t("admin.stats.total_profiles"), value: stats.total_profiles },
    { label: t("admin.stats.total_trips"), value: stats.total_trips },
    { label: t("admin.stats.total_parcels"), value: stats.total_parcels },
    { label: t("admin.stats.total_deals"), value: stats.total_deals },
    { label: t("admin.stats.total_messages"), value: stats.total_messages },
  ];

  return (
    <AdminShell currentPath="/admin" title={t("admin.dashboard")}>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className="maak-card p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-xl font-bold">{card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="maak-card p-4">
        <p className="mb-2 text-sm font-semibold">Deals par statut</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p>proposed: {stats.deals_proposed}</p>
          <p>accepted_by_sender: {stats.deals_accepted_by_sender}</p>
          <p>accepted_by_traveler: {stats.deals_accepted_by_traveler}</p>
          <p>mutually_accepted: {stats.deals_mutually_accepted}</p>
          <p>pickup_confirmed: {stats.deals_pickup_confirmed}</p>
          <p>delivered: {stats.deals_delivered}</p>
          <p>closed: {stats.deals_closed}</p>
        </div>
      </Card>
    </AdminShell>
  );
}
