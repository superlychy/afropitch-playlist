"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Loader2, Plus, Music2, Upload } from "lucide-react";

type Song = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string | null;
  spotify_url: string | null;
  sort_order: number;
  active: boolean;
};

const empty = { title: "", artist_name: "", cover_url: "", audio_url: "", spotify_url: "", sort_order: "0" };

export function AdminMixedSongs() {
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [uploading, setUploading] = useState<"audio" | "cover" | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("mixed_songs").select("*").order("sort_order").order("created_at", { ascending: false });
    setSongs((data ?? []) as Song[]);
    const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "mixed_playlist_url").single();
    setPlaylistUrl(setting?.value ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) =>
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

  const add = async () => {
    if (!form.title.trim() || !form.artist_name.trim()) {
      toast("Title and artist are required", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mixed_songs").insert({
      title: form.title.trim(),
      artist_name: form.artist_name.trim(),
      cover_url: form.cover_url.trim() || null,
      audio_url: form.audio_url.trim() || null,
      spotify_url: form.spotify_url.trim() || null,
      sort_order: parseInt(form.sort_order || "0", 10),
    });
    setSaving(false);
    if (error) toast("Could not add song: " + error.message, "error");
    else {
      toast("Song added to the showcase", "success");
      setForm(empty);
      load();
    }
  };

  const toggle = async (s: Song) => {
    await supabase.from("mixed_songs").update({ active: !s.active }).eq("id", s.id);
    load();
  };

  const remove = async (s: Song) => {
    if (!confirm(`Remove "${s.title}" from the showcase?`)) return;
    await supabase.from("mixed_songs").delete().eq("id", s.id);
    load();
  };

  const savePlaylist = async () => {
    setSavingPlaylist(true);
    const { error } = await supabase.from("site_settings").upsert(
      { key: "mixed_playlist_url", value: playlistUrl.trim() },
      { onConflict: "key" }
    );
    setSavingPlaylist(false);
    if (error) toast("Could not save playlist: " + error.message, "error");
    else toast("Playlist link saved", "success");
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading showcase…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-white font-semibold mb-1">Mixed by AfroPitch — public showcase</h3>
        <p className="text-gray-500 text-sm mb-4">Songs added here appear on the public <span className="text-gray-300">/mixed</span> page.</p>

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
            <input value={form.sort_order} onChange={set("sort_order")} placeholder="Order (0 = first)" type="number" className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            <div className="md:col-span-2">
              <Button onClick={add} disabled={saving} className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Add song
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {songs.length === 0 && <p className="text-gray-500 text-sm">No songs yet.</p>}
          {songs.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">{s.title}</div>
                <div className="text-gray-500 text-xs truncate">{s.artist_name}{!s.active && " · hidden"}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggle(s)} className="rounded-xl text-xs">
                {s.active ? "Hide" : "Show"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(s)} className="rounded-xl text-xs text-red-400 border-red-500/30">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-1">Spotify playlist</h3>
        <p className="text-gray-500 text-sm mb-4">Paste the Spotify playlist URL to embed it at the top of /mixed.</p>
        <div className="flex gap-2">
          <input
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/…"
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
          />
          <Button onClick={savePlaylist} disabled={savingPlaylist} className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
            {savingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
