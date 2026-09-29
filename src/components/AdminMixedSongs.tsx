"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Loader2, Plus, Pencil, Upload, ChevronUp, ChevronDown } from "lucide-react";

type Song = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string | null;
  spotify_url: string | null;
  comment: string | null;
  sort_order: number;
  active: boolean;
};

const FALLBACK_COVER = "/mixed-fallback-cover.png";

const empty = { title: "", artist_name: "", cover_url: "", audio_url: "", spotify_url: "", comment: "", sort_order: "0" };

export function AdminMixedSongs() {
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"audio" | "cover" | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("mixed_songs").select("*").order("sort_order").order("created_at", { ascending: false });
    setSongs((data ?? []) as Song[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setArea = (k: string) => (e: ChangeEvent<HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Upload a file straight to Cloudinary (signed server-side), then fill the field.
  const uploadFile = async (file: File, kind: "audio" | "cover") => {
    setUploading(kind);
    try {
      const signRes = await fetch("/api/admin/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_type: kind === "cover" ? "image" : "video" }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || "Could not get upload signature");

      const data = new FormData();
      data.append("file", file);
      data.append("api_key", sign.api_key);
      data.append("timestamp", String(sign.timestamp));
      data.append("signature", sign.signature);
      data.append("folder", sign.folder);

      const upRes = await fetch(sign.upload_url, { method: "POST", body: data });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up.error?.message || "Upload failed");

      setForm((f) => ({ ...f, [kind === "cover" ? "cover_url" : "audio_url"]: up.secure_url }));
      toast(kind === "cover" ? "Cover uploaded" : "Audio uploaded — full track will stream with the AfroPitch voice tag", "success");
    } catch (e) {
      toast("Upload failed: " + (e instanceof Error ? e.message : "unknown error"), "error");
    } finally {
      setUploading(null);
    }
  };

  const onFilePicked = (kind: "audio" | "cover") => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file, kind);
  };

  const startEdit = (s: Song) => {
    setForm({
      title: s.title,
      artist_name: s.artist_name,
      cover_url: s.cover_url ?? "",
      audio_url: s.audio_url ?? "",
      spotify_url: s.spotify_url ?? "",
      comment: s.comment ?? "",
      sort_order: String(s.sort_order),
    });
    setEditingId(s.id);
  };

  const cancelEdit = () => {
    setForm(empty);
    setEditingId(null);
  };

  const save = async () => {
    if (!form.title.trim() || !form.artist_name.trim()) {
      toast("Title and artist are required", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      artist_name: form.artist_name.trim(),
      cover_url: form.cover_url.trim() || null,
      audio_url: form.audio_url.trim() || null,
      spotify_url: form.spotify_url.trim() || null,
      comment: form.comment.trim() || null,
      sort_order: parseInt(form.sort_order || "0", 10),
    };
    const old = editingId ? songs.find((s) => s.id === editingId) : null;
    const { error } = editingId
      ? await supabase.from("mixed_songs").update(payload).eq("id", editingId)
      : await supabase.from("mixed_songs").insert(payload);
    if (error) {
      setSaving(false);
      toast("Could not save song: " + error.message, "error");
      return;
    }
    // After a successful edit, delete any Cloudinary files that are no longer
    // referenced (Drive links are never touched). Keeps orphans from piling up.
    if (old) {
      const stillUsed = [payload.audio_url, payload.cover_url];
      const orphaned = [old.audio_url, old.cover_url].filter(
        (u): u is string => !!u && u.includes("res.cloudinary.com") && !stillUsed.includes(u)
      );
      if (orphaned.length > 0) {
        try {
          await fetch("/api/admin/cloudinary-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: orphaned }),
          });
        } catch {
          toast("Song updated, but old Cloudinary files could not be cleaned up.", "error");
        }
      }
    }
    setSaving(false);
    toast(editingId ? "Song updated" : "Song added to the showcase", "success");
    setForm(empty);
    setEditingId(null);
    load();
  };

  const toggle = async (s: Song) => {
    await supabase.from("mixed_songs").update({ active: !s.active }).eq("id", s.id);
    load();
  };

  // Rearrange the showcase: swap display order with the neighbour above/below.
  const move = async (s: Song, dir: -1 | 1) => {
    const idx = songs.findIndex((x) => x.id === s.id);
    const other = songs[idx + dir];
    if (!other) return;
    let newOrder = other.sort_order;
    const otherOrder = s.sort_order;
    if (newOrder === otherOrder) newOrder = other.sort_order + dir; // equal orders: nudge so the move is visible
    const { error } = await supabase.from("mixed_songs").update({ sort_order: newOrder }).eq("id", s.id);
    if (error) {
      toast("Could not reorder: " + error.message, "error");
      return;
    }
    await supabase.from("mixed_songs").update({ sort_order: otherOrder }).eq("id", other.id);
    load();
  };

  const remove = async (s: Song) => {
    if (!confirm(`Remove "${s.title}" from the showcase?`)) return;
    // Clean up the Cloudinary files too (Drive links are left alone —
    // AfroPitch never deletes Google Drive files).
    const urls = [s.audio_url, s.cover_url].filter(
      (u): u is string => !!u && u.includes("res.cloudinary.com")
    );
    if (urls.length > 0) {
      try {
        const res = await fetch("/api/admin/cloudinary-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const json = await res.json().catch(() => null);
        const failed = json?.results?.filter(
          (r: { deleted: boolean; reason?: string }) => !r.deleted && r.reason !== "not-cloudinary"
        );
        if (failed?.length > 0) toast("Song removed, but some Cloudinary files could not be deleted.", "error");
      } catch {
        toast("Song removed, but Cloudinary cleanup failed.", "error");
      }
    }
    await supabase.from("mixed_songs").delete().eq("id", s.id);
    if (editingId === s.id) cancelEdit();
    load();
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading showcase…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-white font-semibold mb-1">Mixed by AfroPitch — public showcase</h3>
        <p className="text-gray-500 text-sm mb-4">Songs added here appear on the public <span className="text-gray-300">/mixed</span> page.</p>
        {editingId && (
          <p className="text-xs text-yellow-400 mb-2">
            Editing “{form.title || "song"}” — change any detail or re-upload the files, then save.
          </p>
        )}

        <Card className="bg-white/5 border-white/10 mb-4">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.title} onChange={set("title")} placeholder="Song title *" className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            <input value={form.artist_name} onChange={set("artist_name")} placeholder="Artist name *" className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            <div className="flex gap-2">
              <input value={form.audio_url} onChange={set("audio_url")} placeholder="Audio URL (mp3 or Google Drive link…)" className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={onFilePicked("audio")} />
              <Button type="button" variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} disabled={uploading !== null} className="rounded-xl shrink-0">
                {uploading === "audio" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />} Upload MP3
              </Button>
            </div>
            <div className="flex gap-2">
              <input value={form.cover_url} onChange={set("cover_url")} placeholder="Cover image URL" className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked("cover")} />
              <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploading !== null} className="rounded-xl shrink-0">
                {uploading === "cover" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />} Upload
              </Button>
            </div>
            <input value={form.spotify_url} onChange={set("spotify_url")} placeholder="Spotify track URL (optional)" className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Display order — lower shows first (0 = top)</label>
              <input value={form.sort_order} onChange={set("sort_order")} placeholder="0" type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            </div>
            <textarea value={form.comment} onChange={setArea("comment")} placeholder="Comment — producer, contributors, credits… (optional)" rows={2} className="md:col-span-2 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-y" />
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={save} disabled={saving} className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : editingId ? <Pencil className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />} {editingId ? "Save changes" : "Add song"}
              </Button>
              {editingId && (
                <Button onClick={cancelEdit} variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {songs.length === 0 && <p className="text-gray-500 text-sm">No songs yet.</p>}
          {songs.length > 1 && <p className="text-gray-600 text-xs">Tip: use ↑ ↓ to rearrange the showcase order.</p>}
          {songs.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex flex-col shrink-0 -gap-0.5">
                <button onClick={() => move(s, -1)} disabled={i === 0} title="Move up" className="text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500 p-0.5">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(s, 1)} disabled={i === songs.length - 1} title="Move down" className="text-gray-500 hover:text-white disabled:opacity-20 disabled:hover:text-gray-500 p-0.5">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                <img src={s.cover_url || FALLBACK_COVER} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{s.title}</div>
                <div className="text-gray-500 text-xs truncate">{s.artist_name}{!s.active && " · hidden"}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggle(s)} className="rounded-xl text-xs">
                {s.active ? "Hide" : "Show"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => startEdit(s)} className="rounded-xl text-xs" title="Edit song">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(s)} className="rounded-xl text-xs text-red-400 border-red-500/30">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
