"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

export function MixingChat({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("mixing_messages")
      .select("id, body, sender_id, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    const list = (msgs ?? []) as Message[];
    setMessages(list);

    // Resolve display names for the other participants
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const admin = me?.role === "admin";
    setIsAdmin(admin);
    const otherIds = [...new Set(list.filter((m) => m.sender_id !== user.id).map((m) => m.sender_id))];
    if (otherIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", otherIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; full_name: string | null }) => {
        map[p.id] = p.full_name || (admin ? "Artist" : "AfroPitch Engineer");
      });
      otherIds.forEach((id) => {
        if (!map[id]) map[id] = admin ? "Artist" : "AfroPitch Engineer";
      });
      setNameMap(map);
    }

    // Opening the thread marks the other side's messages as read
    await supabase
      .from("mixing_messages")
      .update({ read_by_recipient: true })
      .eq("order_id", orderId)
      .neq("sender_id", user.id)
      .eq("read_by_recipient", false);

    setLoading(false);
    if (firstLoad.current) {
      firstLoad.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [orderId, user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("mixing_messages").insert({
      order_id: orderId,
      sender_id: user.id,
      body: body.slice(0, 2000),
    });
    setSending(false);
    if (!error) {
      setDraft("");
      await load();
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const label = (m: Message) =>
    m.sender_id === user?.id ? "You" : nameMap[m.sender_id] || (isAdmin ? "Artist" : "AfroPitch Engineer");

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">
            No messages yet. Say hello — your engineer replies here.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    mine ? "bg-green-600/20 border border-green-500/30" : "bg-white/5 border border-white/10"
                  }`}
                >
                  <div className={`text-[10px] font-semibold mb-0.5 ${mine ? "text-green-300" : "text-gray-400"}`}>
                    {label(m)}
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap break-words">{m.body}</p>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          maxLength={2000}
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
        />
        <Button size="sm" onClick={send} disabled={sending || !draft.trim()} className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
