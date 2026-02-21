import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { isChatUnlocked, syncMarketplaceExpirations } from "@/lib/marketplace";
import { toast } from "sonner";

export default function DealChat() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { isRTL } = useAppLanguage();
  const [deal, setDeal] = useState<Tables<"deals"> | null>(null);
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  const canChat = useMemo(() => !!deal && isChatUnlocked(deal.status), [deal]);

  useEffect(() => {
    if (!dealId) return;

    void (async () => {
      await syncMarketplaceExpirations();
      const { data } = await supabase.auth.getUser();
      setMyId(data.user?.id ?? null);

      const { data: dealData } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
      setDeal(dealData ?? null);
    })();

    const loadMessages = () => {
      supabase.from("messages").select("*").eq("deal_id", dealId).order("created_at", { ascending: true }).then(({ data }) => {
        setMessages(data ?? []);
      });
    };

    loadMessages();
    const channel = supabase.channel(`deal-chat-${dealId}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `deal_id=eq.${dealId}` }, loadMessages).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const send = async () => {
    if (!dealId || !myId || !text.trim()) return;
    if (!canChat) {
      toast.error("Contact disponible après acceptation des deux parties.");
      return;
    }

    const { error } = await supabase.from("messages").insert({ deal_id: dealId, sender_id: myId, content: text.trim() });
    if (error) toast.error(error.message);
    else setText("");
  };

  return (
    <div className="mobile-page space-y-3">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="maak-section-title">Chat du deal</h1>
      </div>

      {!canChat && <p className="text-sm text-muted-foreground">Contact débloqué après acceptation mutuelle.</p>}

      <div className="space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "border border-border bg-card"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4">
        <div className="mx-auto max-w-md flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message..." />
          <Button onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
