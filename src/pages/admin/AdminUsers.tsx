import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";

type AdminUserRow = {
  created_at: string;
  email: string | null;
  email_confirmed: boolean;
  is_admin: boolean;
  profile_complete: boolean;
  user_id: string;
  wilaya: string | null;
};

export default function AdminUsers() {
  const { t } = useAppLanguage();
  const [rows, setRows] = useState<AdminUserRow[]>([]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("admin_get_users" as never, {
        p_limit: 200,
        p_offset: 0,
      } as never);

      if (error) {
        console.error("[admin:users]", error);
        return;
      }

      setRows((data as AdminUserRow[] | null) ?? []);
    })();
  }, []);

  return (
    <AdminShell currentPath="/admin/users" title={t("admin.users")}>
      <Card className="maak-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">email</th>
                <th className="px-3 py-2">created_at</th>
                <th className="px-3 py-2">email_confirmed</th>
                <th className="px-3 py-2">profile_complete</th>
                <th className="px-3 py-2">wilaya</th>
                <th className="px-3 py-2">is_admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-t border-border/60">
                  <td className="px-3 py-2">{row.email ?? "N/A"}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2">{row.email_confirmed ? "yes" : "no"}</td>
                  <td className="px-3 py-2">{row.profile_complete ? "yes" : "no"}</td>
                  <td className="px-3 py-2">{row.wilaya ?? "N/A"}</td>
                  <td className="px-3 py-2">{row.is_admin ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
