// Smart-link page for a submission: afropitchplay.best/track/<tracking_slug>
// Cached at the edge (ISR, 1h) so fan traffic costs zero Supabase queries.
// Clicks are counted only on outbound platform taps (via /api/go/spotify),
// never on page views.
export const revalidate = 3600;

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import CopyLinkButton from './CopyLinkButton';

const getAdminSupabase = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: { slug: string };
}

const PLATFORMS = [
  { key: 'spotify', label: 'Spotify', col: 'song_link', color: 'bg-[#1DB954] hover:bg-[#1ed760]', icon: '🎧' },
  { key: 'apple', label: 'Apple Music', col: 'apple_music_url', color: 'bg-[#FA243C] hover:bg-[#fb4a5e]', icon: '🍎' },
  { key: 'audiomack', label: 'Audiomack', col: 'audiomack_url', color: 'bg-[#FFA200] hover:bg-[#ffb133]', icon: '🔶' },
  { key: 'boomplay', label: 'Boomplay', col: 'boomplay_url', color: 'bg-[#2EC4B6] hover:bg-[#4ad0c2]', icon: '🌀' },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = getAdminSupabase();
  const { slug } = await Promise.resolve(params);

  const { data: sub } = await supabase
    .from('submissions')
    .select('song_title, artist_name, cover_art_url, playlist:playlists(name)')
    .eq('tracking_slug', slug)
    .single();

  if (!sub) return { title: 'AfroPitch - Link Not Found' };

  const playlist = sub.playlist as { name: string } | { name: string }[] | null;
  const playlistName = Array.isArray(playlist) ? playlist[0]?.name : playlist?.name;

  return {
    title: `${sub.song_title} by ${sub.artist_name} | AfroPitch`,
    description: `Listen to "${sub.song_title}" by ${sub.artist_name} on ${playlistName || "AfroPitch"}. Stream now and help it trend!`,
    openGraph: {
      title: `${sub.song_title} - ${sub.artist_name}`,
      description: `Stream "${sub.song_title}" by ${sub.artist_name} on ${playlistName || "AfroPitch"}`,
      type: 'music.song',
      url: `https://afropitchplay.best/track/${slug}`,
      images: sub.cover_art_url ? [{ url: sub.cover_art_url }] : undefined,
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const supabase = getAdminSupabase();
  const { slug } = await Promise.resolve(params);

  if (!slug) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Invalid Link</h1>
          <p className="text-gray-400">The tracking ID is missing.</p>
        </div>
      </div>
    );
  }

  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      id, song_title, artist_name, song_link, clicks, cover_art_url,
      apple_music_url, audiomack_url, boomplay_url,
      playlist:playlists (name, playlist_link)
    `)
    .eq('tracking_slug', slug)
    .single();

  if (error || !submission) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Link Expired</h1>
          <p className="text-gray-400 text-sm mt-2">This tracking link no longer exists.</p>
        </div>
      </div>
    );
  }

  const newClicks = submission.clicks || 0;
  const clicksNeeded = 100;
  const progress = Math.min(Math.round((newClicks / clicksNeeded) * 100), 100);
  const isTrending = newClicks >= clicksNeeded;

  const playlistName = Array.isArray(submission.playlist)
    ? submission.playlist[0]?.name
    : (submission.playlist as any)?.name;

  const pageUrl = `https://afropitchplay.best/track/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pageUrl)}`;

  const goUrl = (platformKey: string, to: string) =>
    `/api/go/spotify?to=${encodeURIComponent(to)}&kind=${platformKey}&ref=${submission.id}`;

  const shareText = encodeURIComponent(`Check out "${submission.song_title}" by ${submission.artist_name}!`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-green-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500 py-8">
        {/* Cover art */}
        {submission.cover_art_url ? (
          <img src={submission.cover_art_url} alt={submission.song_title} className="w-44 h-44 rounded-2xl mx-auto object-cover shadow-2xl shadow-green-500/20 border border-white/10" />
        ) : (
          <div className="w-44 h-44 rounded-2xl mx-auto bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center shadow-2xl shadow-green-500/20">
            <span className="text-6xl">🎵</span>
          </div>
        )}

        {/* Song Info */}
        <div className="space-y-2">
          <p className="text-green-400 text-sm font-bold uppercase tracking-widest">
            {playlistName || "AfroPitch Playlist"}
          </p>
          <h1 className="text-3xl font-extrabold text-white">{submission.song_title}</h1>
          <p className="text-xl text-gray-400">by {submission.artist_name}</p>
        </div>

        {/* Platform buttons */}
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const url = (submission as any)[p.col] as string | null;
            if (!url) return null;
            return (
              <a
                key={p.key}
                href={goUrl(p.key, url)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full ${p.color} text-white font-bold text-lg px-6 py-3.5 rounded-full shadow-lg transition-all hover:scale-[1.02]`}
              >
                <span>{p.icon}</span> Listen on {p.label}
              </a>
            );
          })}
        </div>

        {/* Viral Progress */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Viral Progress</span>
            <span className={`font-bold ${isTrending ? "text-yellow-400" : "text-green-400"}`}>
              {newClicks}/{clicksNeeded} Streams
            </span>
          </div>
          <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isTrending
                  ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                  : "bg-gradient-to-r from-green-600 to-emerald-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {isTrending ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold animate-pulse">
              <span>🔥</span> TRENDING <span>🔥</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Share this link to boost your ranking! {clicksNeeded - newClicks} more streams to trend.
            </p>
          )}
        </div>

        {/* QR + Share */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Share this song</p>
          <img src={qrUrl} alt="QR code" className="w-32 h-32 mx-auto rounded-lg bg-white p-1" loading="lazy" />
          <div className="flex justify-center gap-3 flex-wrap">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105"
            >
              X
            </a>
            <a
              href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105"
            >
              WhatsApp
            </a>
            <CopyLinkButton url={pageUrl} />
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-600">
          Powered by <span className="text-green-600 font-bold">AfroPitch</span>
        </p>
      </div>
    </div>
  );
}
