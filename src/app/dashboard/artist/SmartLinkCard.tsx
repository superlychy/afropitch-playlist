'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Copy, QrCode, Pencil } from "lucide-react";

interface SmartLinkCardProps {
  submission: {
    id: string;
    song_title: string;
    tracking_slug: string | null;
    clicks: number | null;
    apple_music_url: string | null;
    audiomack_url: string | null;
    boomplay_url: string | null;
    cover_art_url: string | null;
  };
  // Per-platform click counts for this submission, fetched once at the
  // dashboard level (not per card) and passed down.
  stats: Record<string, number>;
  onSaved: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  audiomack: "Audiomack",
  boomplay: "Boomplay",
};

export default function SmartLinkCard({ submission, stats, onSaved }: SmartLinkCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [form, setForm] = useState({
    apple_music_url: submission.apple_music_url || "",
    audiomack_url: submission.audiomack_url || "",
    boomplay_url: submission.boomplay_url || "",
    cover_art_url: submission.cover_art_url || "",
  });

  // Always matches the deployment the artist is actually viewing.
  const trackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/track/${submission.tracking_slug}`
    : `/track/${submission.tracking_slug}`;

  const save = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast("Please sign in again", "error"); return; }
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

  const platformEntries = Object.entries(stats);

  return (
    <div className="mt-3 bg-gradient-to-br from-green-900/30 to-black border border-green-500/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Smart Link
        </p>
        <span className="text-[10px] font-bold text-white bg-green-500/20 px-2 py-0.5 rounded-full">
          {submission.clicks || 0}/100
        </span>
      </div>
      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
          style={{ width: `${Math.min(((submission.clicks || 0) / 100) * 100, 100)}%` }}
        />
      </div>

      {/* Per-platform stats */}
      {platformEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {platformEntries.map(([platform, count]) => (
            <span key={platform} className="text-[10px] font-bold bg-white/10 text-gray-200 px-2 py-0.5 rounded-full">
              {PLATFORM_LABELS[platform] || platform}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black/60 rounded px-2 py-1.5 text-[10px] sm:text-xs text-gray-300 truncate select-all border border-white/5 font-mono">
          {trackUrl}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-green-400 hover:text-green-300 shrink-0 border border-green-500/20"
          onClick={() => {
            navigator.clipboard.writeText(trackUrl);
            toast("Smart link copied!", "success");
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-green-400 hover:text-green-300 shrink-0 border border-green-500/20"
          onClick={() => setShowQr(!showQr)}
        >
          <QrCode className="w-3 h-3 mr-1" /> QR
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-green-400 hover:text-green-300 shrink-0 border border-green-500/20"
          onClick={() => setEditing(!editing)}
        >
          <Pencil className="w-3 h-3 mr-1" /> Links
        </Button>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-2 bg-black/40 rounded-lg p-3">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackUrl)}`}
            alt="Smart link QR code"
            className="w-40 h-40 rounded bg-white p-1"
            loading="lazy"
          />
          <p className="text-[10px] text-gray-500">Fans scan this to open your song page</p>
        </div>
      )}

      {editing && (
        <div className="space-y-2 bg-black/40 rounded-lg p-3">
          <div>
            <Label className="text-[10px] text-gray-400">Apple Music link</Label>
            <Input
              value={form.apple_music_url}
              onChange={(e) => setForm({ ...form, apple_music_url: e.target.value })}
              placeholder="https://music.apple.com/..."
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-400">Audiomack link</Label>
            <Input
              value={form.audiomack_url}
              onChange={(e) => setForm({ ...form, audiomack_url: e.target.value })}
              placeholder="https://audiomack.com/..."
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-400">Boomplay link</Label>
            <Input
              value={form.boomplay_url}
              onChange={(e) => setForm({ ...form, boomplay_url: e.target.value })}
              placeholder="https://www.boomplay.com/..."
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-400">Cover art image link (optional)</Label>
            <Input
              value={form.cover_art_url}
              onChange={(e) => setForm({ ...form, cover_art_url: e.target.value })}
              placeholder="https://..."
              className="h-8 text-xs mt-1"
            />
          </div>
          <Button size="sm" onClick={save} disabled={saving} className="w-full h-8 text-xs bg-green-600 hover:bg-green-500">
            {saving ? "Saving..." : "Save links"}
          </Button>
        </div>
      )}
    </div>
  );
}
