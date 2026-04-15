"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Music, ExternalLink, Play, Users, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Track {
  name: string;
  artists: string;
  spotify_url: string | null;
  album_image: string | null;
  duration: number;
  isrc: string | null;
}

interface PlaylistData {
  playlist: {
    id: string;
    name: string;
    description: string;
    cover_image: string;
    followers: number;
  };
  tracks: Track[];
  total_tracks: number;
  synced_at: string;
}

export default function PlaylistPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async (sync = false) => {
    if (sync) setSyncing(true);
    try {
      // Sync from Spotify
      const syncRes = await fetch("/api/sync-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_id: id }),
      });
      const syncData = await syncRes.json();

      if (syncData.success) {
        setData(syncData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto" />
          <p className="text-gray-400">Loading playlist...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Music className="w-12 h-12 text-gray-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Playlist Not Found</h1>
          <Link href="/playlists" className="text-green-400 hover:underline">
            Browse Playlists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pb-20">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link
          href="/playlists"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Playlists
        </Link>
        {/* Simple Spotify Link Button */}
        {data.playlist.playlist_link && (
          <div className="flex justify-center md:justify-start">
            <a
              href={data.playlist.playlist_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-green-500/25"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.48-.84.6-1.32.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.36.181.54.84.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.2-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.54-1.019.72-1.56.3z" />
              </svg>
              Listen on Spotify
            </a>
          </div>
        )}
      </div>

      {/* Spotify Embed */}
      <div className="max-w-4xl mx-auto px-4 mt-6 md:mt-12">
        {data.playlist.playlist_link ? (
          <div className="w-full">
            <iframe
              src={`https://open.spotify.com/embed/playlist/${
                data.playlist.playlist_link.match(/playlist\/([a-zA-Z0-9]+)/)?.[1] || ""
              }?utm_source=generator&theme=0`}
              width="100%"
              height="600"
              style={{ borderRadius: "12px", border: "none" }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
            <Music className="w-12 h-12 mx-auto text-gray-600 mb-2" />
            <p className="text-gray-400">
              No Spotify link available for this playlist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Button({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`flex items-center px-4 py-2 rounded-md ${className}`} {...props}>
      {children}
    </button>
  );
}
