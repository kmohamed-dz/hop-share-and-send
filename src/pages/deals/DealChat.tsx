import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export default function DealChat() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Tables<"deals"> | null>(null);
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  const canChat = useMemo(() => !!deal && ["mutually_accepted", "picked_up", "delivered_confirmed"].includes(deal.status), [deal]);

  useEffect(() => {
    if (!dealId) return;

    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));

    supabase.from("deals").select("*").eq("id", dealId).maybeSingle().then(({ data }) => {
      setDeal(data ?? null);
    });

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
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Chat du deal</h1>
      </div>

      {!canChat && <p className="text-sm text-muted-foreground">Contact disponible après acceptation des deux parties.</p>}

      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl p-3 text-sm ${m.sender_id === myId ? "bg-primary text-primary-foreground ml-8" : "bg-card border border-border mr-8"}`}>
            {m.content}
          </div>
        ))}
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
