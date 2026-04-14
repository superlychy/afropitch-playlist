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

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Cover Image */}
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-xl">
            {data.playlist.cover_image ? (
              <img
                src={data.playlist.cover_image}
                alt={data.playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-extrabold text-white">
              {data.playlist.name}
            </h1>
            <p className="text-gray-400">{data.playlist.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {data.playlist.followers?.toLocaleString()} followers
              </span>
              <span>{data.total_tracks} tracks</span>
              <span>Updated {new Date(data.synced_at).toLocaleDateString()}</span>
            </div>
            <Button
              onClick={() => fetchData(true)}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync from Spotify"}
            </Button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-w-4xl mx-auto px-4 mt-12">
        <h2 className="text-xl font-bold text-white mb-6">Tracks</h2>

        {data.tracks.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl">
            <Music className="w-12 h-12 mx-auto text-gray-600 mb-2" />
            <p className="text-gray-400">
              No tracks found. Click "Sync from Spotify" to fetch tracks.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.tracks.map((track, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <span className="w-8 text-center text-sm text-gray-500 font-medium">
                  {i + 1}
                </span>
                {track.album_image ? (
                  <img
                    src={track.album_image}
                    alt={track.name}
                    className="w-12 h-12 rounded"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center">
                    <Music className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {track.name}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {track.artists}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDuration(track.duration)}
                </span>
                {track.spotify_url && (
                  <a
                    href={track.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4 text-green-500" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Spotify Embed */}
        {data.tracks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-6">
              Listen on Spotify
            </h2>
            <iframe
              src={`https://open.spotify.com/embed/playlist/${
                data.tracks[0]?.spotify_url?.match(/playlist\/([a-zA-Z0-9]+)/)?.[1] || ""
              }?utm_source=generator&theme=0`}
              width="100%"
              height="352"
              style={{ borderRadius: "12px", border: "none" }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
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
