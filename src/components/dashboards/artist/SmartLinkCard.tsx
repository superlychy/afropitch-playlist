"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, QrCode, Pencil, Check } from "lucide-react";
import { CoverArt } from "./CoverArt";

export interface SmartLinkSubmission {
  id: string;
  song_title: string;
  tracking_slug: string | null;
  clicks: number | null;
  apple_music_url: string | null;
  audiomack_url: string | null;
  boomplay_url: string | null;
  cover_art_url: string | null;
  playlist?: { name: string } | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple",
  audiomack: "Audiomack",
  boomplay: "Boomplay",
};

// One card per song: copy link, QR, editable platform URLs, per-platform
// click chips. Stats are fetched once at dashboard level and passed down.
// "card" matches the mobile mockup; "panel" matches the desktop side column.
export function SmartLinkCard({
  submission,
  stats,
  onSaved,
  variant = "card",
}: {
  submission: SmartLinkSubmission;
  stats: Record<string, number>;
  onSaved: () => void;
  variant?: "card" | "panel";
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    apple_music_url: submission.apple_music_url || "",
    audiomack_url: submission.audiomack_url || "",
    boomplay_url: submission.boomplay_url || "",
    cover_art_url: submission.cover_art_url || "",
  });

  const trackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${submission.tracking_slug}`
      : `/track/${submission.tracking_slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      toast("Smart link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link", "error");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast("Please sign in again", "error");
        return;
      }
      const res = await fetch("/api/artist/update-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: submission.id, ...form }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast("Smart link updated!", "success");
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalTaps = submission.clicks || 0;

  // Platform chips: a platform is "on" when it has a URL (Spotify is always
  // on from the submission's Spotify link). Mockup labels: "Apple" short.
  const platformOrder = ["spotify", "audiomack", "apple", "boomplay"] as const;
  const platformOn: Record<string, boolean> = {
    spotify: true,
    audiomack: !!(stats.audiomack || submission.audiomack_url),
    apple: !!(stats.apple || submission.apple_music_url),
    boomplay: !!(stats.boomplay || submission.boomplay_url),
  };

  const editForm = (
    <div className="space-y-2.5 bg-black/40 rounded-xl p-3">
      <div>
        <Label className="text-[11px] text-zinc-400">Apple Music link</Label>
        <Input
          value={form.apple_music_url}
          onChange={(e) => setForm({ ...form, apple_music_url: e.target.value })}
          placeholder="https://music.apple.com/..."
          className="h-9 text-xs mt-1 bg-[#1B1B1F] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-[11px] text-zinc-400">Audiomack link</Label>
        <Input
          value={form.audiomack_url}
          onChange={(e) => setForm({ ...form, audiomack_url: e.target.value })}
          placeholder="https://audiomack.com/..."
          className="h-9 text-xs mt-1 bg-[#1B1B1F] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-[11px] text-zinc-400">Boomplay link</Label>
        <Input
          value={form.boomplay_url}
          onChange={(e) => setForm({ ...form, boomplay_url: e.target.value })}
          placeholder="https://www.boomplay.com/..."
          className="h-9 text-xs mt-1 bg-[#1B1B1F] border-white/10 text-white"
        />
      </div>
      <div>
        <Label className="text-[11px] text-zinc-400">Cover art image link (optional)</Label>
        <Input
          value={form.cover_art_url}
          onChange={(e) => setForm({ ...form, cover_art_url: e.target.value })}
          placeholder="https://..."
          className="h-9 text-xs mt-1 bg-[#1B1B1F] border-white/10 text-white"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full h-10 text-sm bg-[#22C55E] hover:bg-[#1aa34e] disabled:opacity-60 text-[#04120a] font-extrabold rounded-xl"
      >
        {saving ? "Saving..." : "Save links"}
      </button>
    </div>
  );

  const qrBox = (
    <div className="flex flex-col items-center gap-2 bg-black/40 rounded-xl p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackUrl)}`}
        alt="Smart link QR code"
        className={variant === "panel" ? "w-[120px] h-[120px] rounded-lg bg-white p-1" : "w-40 h-40 rounded-lg bg-white p-1"}
        loading="lazy"
      />
      <p className="text-[10px] text-zinc-500">Fans scan this to open your song page</p>
    </div>
  );

  if (variant === "panel") {
    // Desktop side column: QR visible, copy row, platform chips, progress.
    return (
      <div className="bg-[#141417] border border-white/[0.08] rounded-[20px] p-5">
        <h2 className="text-base font-bold text-white">Top smart link</h2>
        <p className="text-zinc-500 text-xs mt-1 mb-3 truncate">
          {submission.song_title}
          {submission.playlist?.name ? ` · ${submission.playlist.name}` : ""}
        </p>
        {qrBox}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 min-w-0 bg-[#1B1B1F] border border-white/[0.08] rounded-[10px] px-3 py-2.5 text-xs text-zinc-400 truncate">
            {trackUrl}
          </div>
          <button
            onClick={copy}
            className="shrink-0 bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a] rounded-[10px] px-4 text-xs font-extrabold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {platformOrder.map((p) => (
            <div
              key={p}
              className={`flex-1 text-center rounded-xl px-1 py-2.5 text-xs font-bold ${
                platformOn[p] ? "bg-[#1B1B1F] border border-white/[0.08] text-zinc-200" : "bg-[#1B1B1F] border border-white/[0.08] text-zinc-600 opacity-50"
              }`}
            >
              {PLATFORM_LABELS[p]}
              <b className="block text-[#22C55E] text-[15px] mt-0.5">{stats[p] || 0}</b>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
            <span>Viral progress</span>
            <b className="text-white">{totalTaps} / 100</b>
          </div>
          <div className="h-2 bg-[#1B1B1F] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#22C55E] to-[#4ADE80] rounded-full transition-all"
              style={{ width: `${Math.min((totalTaps / 100) * 100, 100)}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="w-full mt-3 border border-white/[0.08] bg-[#1B1B1F] hover:bg-white/5 text-white rounded-[10px] py-2.5 text-xs font-bold"
        >
          {editing ? "Close editor" : "Edit platform links"}
        </button>
        {editing && <div className="mt-3">{editForm}</div>}
      </div>
    );
  }

  // Mobile card per the mockup.
  return (
    <div className="bg-[#141417] border border-white/[0.08] rounded-[20px] p-3.5 mb-3">
      <div className="flex gap-3 items-center mb-3">
        <CoverArt src={submission.cover_art_url} alt={submission.song_title} size={56} rounded={14} />
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-bold text-white truncate">{submission.song_title}</h4>
          <p className="text-xs text-zinc-400 truncate">{submission.playlist?.name || "Smart link"}</p>
        </div>
        <div className="text-right shrink-0">
          <b className="text-lg text-[#22C55E] block">{totalTaps}</b>
          <span className="text-[10px] text-zinc-500">taps</span>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {platformOrder.map((p) =>
          platformOn[p] ? (
            <span
              key={p}
              className="flex items-center gap-1.5 bg-[#1B1B1F] border border-white/[0.08] rounded-full px-3 py-[7px] text-xs font-semibold text-zinc-200"
            >
              {PLATFORM_LABELS[p]}
              <span className="bg-[#22C55E]/15 text-[#22C55E] rounded-full px-2 py-[1px] text-[11px] font-extrabold">
                {stats[p] || 0}
              </span>
            </span>
          ) : (
            <span
              key={p}
              className="flex items-center gap-1 bg-[#1B1B1F] border border-white/[0.08] rounded-full px-3 py-[7px] text-xs font-semibold text-zinc-500 opacity-45"
            >
              + {PLATFORM_LABELS[p]}
            </span>
          )
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={copy}
          className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a] rounded-xl py-[11px] px-1 text-xs font-extrabold flex items-center justify-center gap-1.5"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          onClick={() => setShowQr(!showQr)}
          className="border border-white/[0.08] bg-[#1B1B1F] hover:bg-white/5 text-white rounded-xl py-[11px] px-1 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <QrCode className="w-3.5 h-3.5" />
          QR code
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="border border-white/[0.08] bg-[#1B1B1F] hover:bg-white/5 text-white rounded-xl py-[11px] px-1 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit links
        </button>
      </div>
      {showQr && <div className="mt-3">{qrBox}</div>}
      {editing && <div className="mt-3">{editForm}</div>}
    </div>
  );
}
