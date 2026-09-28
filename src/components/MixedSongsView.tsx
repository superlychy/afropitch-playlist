"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Music2, ExternalLink, Loader2, BadgeCheck, Play, Pause } from "lucide-react";

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
export function toDirectAudioUrl(url: string): string {
  try {
    const u = new URL(url.trim());
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

// "Mixed by AfroPitch" voice tag, subtle: first at 0.5s, then every 40s
// (≈3x on a 2-minute song, more on longer songs). Music ducks while it plays.
const TAG_EVERY = 40;
function WatermarkedAudio({ src, tagSrc = "/mixed-tag.mp3" }: { src: string; tagSrc?: string }) {
  const songRef = useRef<HTMLAudioElement | null>(null);
  const tagRef = useRef<HTMLAudioElement | null>(null);
  const nextTagRef = useRef(0.5);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const song = songRef.current;
    const tag = tagRef.current;
    if (!song || !tag) return;
    nextTagRef.current = 0.5;

    const onTime = () => {
      const t = song.currentTime;
      const d = song.duration;
      if (d > 0) setProgress(Math.min(t / d, 1));
      if (t >= nextTagRef.current) {
        nextTagRef.current = t + TAG_EVERY;
        song.volume = 0.3;
        tag.currentTime = 0;
        tag.play().catch(() => {
          if (songRef.current) songRef.current.volume = 1;
        });
      }
    };
    const onTagEnd = () => {
      if (songRef.current) songRef.current.volume = 1;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      nextTagRef.current = 0.5;
      setPlaying(false);
    };

    song.addEventListener("timeupdate", onTime);
    song.addEventListener("play", onPlay);
    song.addEventListener("pause", onPause);
    song.addEventListener("ended", onEnded);
    tag.addEventListener("ended", onTagEnd);
    return () => {
      song.removeEventListener("timeupdate", onTime);
      song.removeEventListener("play", onPlay);
      song.removeEventListener("pause", onPause);
      song.removeEventListener("ended", onEnded);
      tag.removeEventListener("ended", onTagEnd);
    };
  }, [src]);

  const toggle = () => {
    const s = songRef.current;
    if (!s) return;
    if (s.paused) s.play().catch(() => {});
    else s.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const s = songRef.current;
    const d = s?.duration;
    if (!s || !d) return;
    const r = e.currentTarget.getBoundingClientRect();
    s.currentTime = Math.max(0, Math.min(((e.clientX - r.left) / r.width) * d, d));
  };

  return (
    <div className="mt-3">
      <audio ref={songRef} src={src} preload="none" className="hidden" />
      <audio ref={tagRef} src={tagSrc} preload="auto" className="hidden" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 cursor-pointer" onClick={seek}>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
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
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-gradient-to-br from-green-500/30 to-orange-500/30 flex items-center justify-center shrink-0">
                    {s.cover_url ? (
                      <img src={s.cover_url} alt={`${s.title} cover`} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-7 h-7 text-green-300/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{s.title}</div>
                    <div className="text-gray-400 text-sm truncate">{s.artist_name}</div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-300 bg-green-950/50 border border-green-500/30 rounded-full px-2 py-0.5 mt-1.5">
                      <BadgeCheck className="w-3 h-3" /> Mixed by AfroPitch
                    </span>
                  </div>
                </div>
                {s.audio_url ? (
                  <WatermarkedAudio src={toDirectAudioUrl(s.audio_url)} />
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
