import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

type AdminDealRow = {
  created_at: string;
  id: string;
  owner_user_id: string;
  status: string;
  traveler_user_id: string;
};

export default function AdminDeals() {
  const { t } = useAppLanguage();
  const [rows, setRows] = useState<AdminDealRow[]>([]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_get_deals" as never, {
        p_limit: 200,
        p_offset: 0,
      } as never);

      if (error) {
        console.error("[admin:deals]", error);
        return;
      }

      setRows((data as AdminDealRow[] | null) ?? []);
    })();
  }, []);

  return (
    <AdminShell currentPath="/admin/deals" title={t("admin.deals")}>
      <Card className="maak-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">sender</th>
                <th className="px-3 py-2">traveler</th>
                <th className="px-3 py-2">created_at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.owner_user_id}</td>
                  <td className="px-3 py-2">{row.traveler_user_id}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
