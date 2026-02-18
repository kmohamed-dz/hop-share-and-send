import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

type AdminTripRow = {
  created_at: string;
  departure_date: string;
  destination_wilaya: string;
  id: string;
  origin_wilaya: string;
  status: string;
  user_id: string;
};

export default function AdminTrips() {
  const { t } = useAppLanguage();
  const [rows, setRows] = useState<AdminTripRow[]>([]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_get_trips" as never, {
        p_limit: 200,
        p_offset: 0,
      } as never);

      if (error) {
        console.error("[admin:trips]", error);
        return;
      }

      setRows((data as AdminTripRow[] | null) ?? []);
    })();
  }, []);

  return (
    <AdminShell currentPath="/admin/trips" title={t("admin.trips")}>
      <Card className="maak-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">origin</th>
                <th className="px-3 py-2">destination</th>
                <th className="px-3 py-2">departure</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">created_by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{row.origin_wilaya}</td>
                  <td className="px-3 py-2">{row.destination_wilaya}</td>
                  <td className="px-3 py-2">{new Date(row.departure_date).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.user_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
