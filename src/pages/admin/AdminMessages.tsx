import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

type AdminMessageRow = {
  created_at: string;
  deal_id: string;
  id: string;
  sender_id: string;
};

export default function AdminMessages() {
  const { t } = useAppLanguage();
  const [rows, setRows] = useState<AdminMessageRow[]>([]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_get_messages" as never, {
        p_limit: 200,
        p_offset: 0,
      } as never);

      if (error) {
        console.error("[admin:messages]", error);
        return;
      }

      setRows((data as AdminMessageRow[] | null) ?? []);
    })();
  }, []);

  return (
    <AdminShell currentPath="/admin/messages" title={t("admin.messages")}>
      <Card className="maak-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">deal_id</th>
                <th className="px-3 py-2">sender_id</th>
                <th className="px-3 py-2">created_at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{row.deal_id}</td>
                  <td className="px-3 py-2">{row.sender_id}</td>
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
