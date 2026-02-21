import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NotificationRow = {
  body: string;
  created_at: string;
  deal_id: string | null;
  id: string;
  is_read: boolean;
  title: string;
  type: string;
  user_id: string;
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      setMyUserId(userId);
      if (!userId) {
        setRows([]);
        return;
      }

      const { data } = await supabase
        .from("notifications" as never)
        .select("id,user_id,type,title,body,deal_id,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      setRows(((data as NotificationRow[] | null) ?? []).filter(Boolean));

      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          async () => {
            const { data: refreshed } = await supabase
              .from("notifications" as never)
              .select("id,user_id,type,title,body,deal_id,is_read,created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(20);
            setRows(((refreshed as NotificationRow[] | null) ?? []).filter(Boolean));
          }
        )
        .subscribe();
    };

    void load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = useMemo(() => rows.filter((entry) => !entry.is_read).length, [rows]);

  const markRead = async (id: string) => {
    if (!myUserId) return;
    await supabase.from("notifications" as never).update({ is_read: true } as never).eq("id", id).eq("user_id", myUserId);
    setRows((prev) => prev.map((entry) => (entry.id === id ? { ...entry, is_read: true } : entry)));
  };

  const markAllRead = async () => {
    if (!myUserId || unreadCount === 0) return;
    await supabase.from("notifications" as never).update({ is_read: true } as never).eq("user_id", myUserId).eq("is_read", false);
    setRows((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full bg-accent hover:bg-accent/80">
          <Bell className="h-5 w-5 text-primary" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className={cn("text-xs text-primary hover:underline", unreadCount === 0 && "pointer-events-none opacity-40")}
            onClick={() => void markAllRead()}
            type="button"
          >
            Tout lire
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune notification</p>
          ) : (
            rows.map((entry) => (
              <button
                key={entry.id}
                className={cn(
                  "w-full border-b px-3 py-2.5 text-left hover:bg-muted/60",
                  !entry.is_read && "bg-primary/5"
                )}
                onClick={() => {
                  void markRead(entry.id);
                  setOpen(false);
                  navigate(entry.deal_id ? `/deals/${entry.deal_id}` : "/messages");
                }}
                type="button"
              >
                <p className="text-sm font-medium">{entry.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
