"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, Square, Lock } from "lucide-react";

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
};

const VOICE_MAX_SECONDS = 120;

async function uploadVoiceNote(orderId: string, blob: Blob): Promise<string> {
  const signRes = await fetch("/api/mixing/voice-note-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  const sign = await signRes.json();
  if (!signRes.ok) throw new Error(sign.error || "Could not get upload signature");

  const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
  const data = new FormData();
  data.append("file", file);
  data.append("api_key", sign.api_key);
  data.append("timestamp", String(sign.timestamp));
  data.append("signature", sign.signature);
  data.append("folder", sign.folder);

  const upRes = await fetch(sign.upload_url, { method: "POST", body: data });
  const up = await upRes.json();
  if (!upRes.ok) throw new Error(up.error?.message || "Upload failed");
  return up.secure_url as string;
}

export function MixingChat({ orderId, readOnly = false }: { orderId: string; readOnly?: boolean }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("mixing_messages")
      .select("id, body, sender_id, created_at, attachment_url, attachment_type")
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

  useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recorderRef.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  const send = async () => {
    const body = draft.trim();
    if (!body || !user || sending || readOnly) return;
    setSending(true);
    setSendError(null);
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
    } else {
      setSendError("Message failed to send. Please try again.");
    }
  };

  const stopRecording = useCallback(() => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    const rec = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    setRecSecs(0);
    if (rec && rec.state !== "inactive") rec.stop();
    else rec?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  const startRecording = async () => {
    if (recording || uploadingVoice || readOnly || !user) return;
    setSendError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) return; // too short, discard
        setUploadingVoice(true);
        try {
          const url = await uploadVoiceNote(orderId, blob);
          const { error } = await supabase.from("mixing_messages").insert({
            order_id: orderId,
            sender_id: user.id,
            body: "Voice note",
            attachment_url: url,
            attachment_type: "voice",
          });
          if (error) throw error;
          await load();
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (e) {
          setSendError(e instanceof Error ? e.message : "Voice note failed to send.");
        } finally {
          setUploadingVoice(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => {
        setRecSecs((s) => {
          if (s + 1 >= VOICE_MAX_SECONDS) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setSendError("Microphone access was denied. Allow it to send a voice note.");
    }
  };

  const label = (m: Message) =>
    m.sender_id === user?.id ? "You" : nameMap[m.sender_id] || (isAdmin ? "Artist" : "AfroPitch Engineer");

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      {readOnly && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
          <Lock className="w-3 h-3" /> This window is closed. Message history is kept for reference.
        </p>
      )}
      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">
            No messages yet. Say hello, your engineer replies here.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const isVoice = m.attachment_type === "voice" && m.attachment_url;
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
                  {isVoice ? (
                    <audio controls src={m.attachment_url!} className="w-52 h-9 max-w-full" />
                  ) : (
                    <p className="text-sm text-white whitespace-pre-wrap break-words">{m.body}</p>
                  )}
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
      {!readOnly && (
        <div className="flex gap-2 mt-3">
          {recording ? (
            <button
              onClick={stopRecording}
              className="flex-1 rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-2 text-sm text-red-300 flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Recording… {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")} — tap to send
            </button>
          ) : (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Write a message…"
                maxLength={2000}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
              />
              <Button
                size="sm"
                onClick={startRecording}
                disabled={uploadingVoice}
                variant="outline"
                className="rounded-xl border-white/20"
                aria-label="Send a voice note"
                title="Send a voice note"
              >
                {uploadingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button size="sm" onClick={send} disabled={sending || !draft.trim()} className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      )}
      {sendError && (
        <p className="mt-2 text-xs text-red-400">{sendError}</p>
      )}
    </div>
  );
}
