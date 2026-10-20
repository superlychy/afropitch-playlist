export const dynamic = 'force-dynamic';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import Link from 'next/link';
import { Disc3, ExternalLink } from 'lucide-react';

const getAdminSupabase = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = getAdminSupabase();
  const { slug } = await Promise.resolve(params);

  const { data: sub } = await supabase
    .from('submissions')
    .select('song_title, artist_name, song_link, cover_art_url, playlist:playlists!submissions_playlist_id_fkey(name)')
    .eq('tracking_slug', slug)
    .single();

  if (!sub) return { title: 'AfroPitch - Link Not Found' };

  const playlist = sub.playlist as { name: string } | { name: string }[] | null;
  const playlistName = Array.isArray(playlist) ? playlist[0]?.name : playlist?.name;

  return {
    title: `${sub.song_title} by ${sub.artist_name} | AfroPitch`,
    description: `Listen to "${sub.song_title}" by ${sub.artist_name} on ${playlistName || "AfroPitch"}. Pick your platform.`,
    openGraph: {
      title: `${sub.song_title} - ${sub.artist_name}`,
      description: `Stream "${sub.song_title}" by ${sub.artist_name} on ${playlistName || "AfroPitch"}`,
      type: 'music.song',
      url: `https://afropitchplay.best/track/${slug}`,
      ...(sub.cover_art_url ? { images: [sub.cover_art_url] } : {}),
    },
  };
}

// Song page (ffm.to style): one song, its cover, its platform links.
// The click is logged silently against this submission (trial system +
// artist dashboard stats). No counts or bios are shown to viewers here.
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
      id, artist_id, song_title, artist_name, song_link, apple_music_url,
      audiomack_url, boomplay_url, deezer_url, youtube_music_url, cover_art_url,
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

  // Silent click log for this song.
  const { headers } = await import('next/headers');
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
  await supabase.rpc('increment_clicks', {
    submission_id: submission.id,
    ip_address: ip,
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_slug')
    .eq('id', submission.artist_id)
    .single();

  const playlist = submission.playlist as { name: string; playlist_link: string | null } | { name: string; playlist_link: string | null }[] | null;
  const pl = Array.isArray(playlist) ? playlist[0] ?? null : playlist;

  const platforms: { label: string; url: string }[] = [];
  const push = (label: string, url: string | null) => {
    if (url?.trim()) platforms.push({ label, url: url.trim() });
  };
  push("Spotify", submission.song_link);
  push("Apple Music", submission.apple_music_url);
  push("Audiomack", submission.audiomack_url);
  push("Boomplay", submission.boomplay_url);
  push("Deezer", submission.deezer_url);
  push("YouTube Music", submission.youtube_music_url);

  const shareText = `Check out "${submission.song_title}" by ${submission.artist_name}!`;
  const shareUrl = `https://afropitchplay.best/track/${slug}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-green-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500 py-10">
        {/* Cover art */}
        <div className="w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-zinc-800 border border-white/10 shadow-2xl flex items-center justify-center">
          {submission.cover_art_url ? (
            <img src={submission.cover_art_url} alt={submission.song_title} className="w-full h-full object-cover" />
          ) : (
            <Disc3 className="w-20 h-20 text-zinc-700" />
          )}
        </div>

        {/* Title / artist */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-white">{submission.song_title}</h1>
          {profile?.profile_slug ? (
            <Link href={`/artist/${profile.profile_slug}`} className="text-lg text-zinc-400 hover:text-[#22C55E] transition-colors">
              {submission.artist_name}
            </Link>
          ) : (
            <p className="text-lg text-zinc-400">{submission.artist_name}</p>
          )}
          {pl && (
            <p className="text-xs font-bold text-[#22C55E] uppercase tracking-widest pt-1">
              On {pl.name}
            </p>
          )}
        </div>

        {/* Platform buttons */}
        <div className="space-y-2.5">
          {platforms.map((p) => (
            <a
              key={p.label}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#22C55E]/40 rounded-2xl px-5 py-3.5 transition-all"
            >
              <span className="font-bold text-white">{p.label}</span>
              <ExternalLink className="w-4 h-4 text-zinc-500" />
            </a>
          ))}
          {platforms.length === 0 && (
            <p className="text-zinc-500 text-sm">Streaming links coming soon.</p>
          )}
          {pl?.playlist_link && (
            <a
              href={pl.playlist_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a] font-extrabold rounded-2xl px-5 py-3.5 transition-all"
            >
              Open playlist
            </a>
          )}
        </div>

        {/* Share */}
        <div className="flex justify-center gap-3 pt-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-400 border border-white/10 rounded-full px-4 py-2 hover:text-white hover:border-white/30 transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-400 border border-white/10 rounded-full px-4 py-2 hover:text-white hover:border-white/30 transition-colors"
          >
            Share on WhatsApp
          </a>
        </div>

        <p className="text-xs text-zinc-600 pt-2">
          Powered by <span className="text-green-600 font-bold">AfroPitch</span>
        </p>
      </div>
    </div>
  );
}
