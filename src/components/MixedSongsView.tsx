"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Music2, ExternalLink, Loader2, BadgeCheck } from "lucide-react";

type Song = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string | null;
  spotify_url: string | null;
};

function spotifyEmbedUrl(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
}

// Google Drive share links play fine in an <audio> tag once converted to a
// direct download URL, so engineers can paste a Drive link instead of
// uploading audio anywhere (zero storage on our side).
function toDirectAudioUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("drive.google.com")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = m?.[1] || u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function MixedSongsView() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlistEmbed, setPlaylistEmbed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mixed_songs")
        .select("id, title, artist_name, cover_url, audio_url, spotify_url")
        .eq("active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      setSongs((data ?? []) as Song[]);
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mixed_playlist_url")
        .single();
      if (setting?.value) setPlaylistEmbed(spotifyEmbedUrl(setting.value));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div>
      {playlistEmbed && (
        <div className="max-w-3xl mx-auto mb-14">
          <iframe
            src={playlistEmbed}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-2xl"
            title="Mixed by AfroPitch playlist"
          />
        </div>
      )}

      {songs.length === 0 ? (
        <div className="text-center py-16 max-w-xl mx-auto">
          <Music2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            The first AfroPitch-mixed releases are on their way. Check back soon —
            or be one of the first artists on the wall.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {songs.map((s) => (
            <Card key={s.id} className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
              <div className="aspect-square bg-black/40 flex items-center justify-center overflow-hidden">
                {s.cover_url ? (
                  <img src={s.cover_url} alt={`${s.title} cover`} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-12 h-12 text-gray-700" />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{s.title}</div>
                    <div className="text-gray-400 text-sm truncate">{s.artist_name}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-300 bg-green-950/50 border border-green-500/30 rounded-full px-2 py-0.5 shrink-0">
                    <BadgeCheck className="w-3 h-3" /> Mixed by AfroPitch
                  </span>
                </div>
                {s.audio_url ? (
                  <audio controls preload="none" src={toDirectAudioUrl(s.audio_url)} className="w-full mt-3 h-9" />
                ) : s.spotify_url && spotifyEmbedUrl(s.spotify_url) ? (
                  <iframe
                    src={spotifyEmbedUrl(s.spotify_url)!}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="w-full mt-3 rounded-md"
                    title={`${s.title} preview`}
                  />
                ) : null}
                {s.spotify_url && s.audio_url && (
                  <a
                    href={s.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-400 text-sm mt-3 hover:underline"
                  >
                    Listen on Spotify <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
