export const dynamic = 'force-dynamic';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { ArtistFanPage, type FanSong } from '@/components/ArtistFanPage';
import type { ArtistProfile } from '@/components/ArtistCard';

const getAdminSupabase = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: { slug: string };
}

const CLICKS_NEEDED = 100;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = getAdminSupabase();
  const { slug } = await Promise.resolve(params);

  const { data: sub } = await supabase
    .from('submissions')
    .select('song_title, artist_name, song_link, playlist:playlists(name)')
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

  // 1. Fetch the tracked submission.
  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      id, artist_id, song_title, artist_name, song_link, apple_music_url,
      audiomack_url, boomplay_url, cover_art_url, clicks,
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

  // 2. Log the click against THIS song (trial + trending systems depend on it).
  const { headers } = await import('next/headers');
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');

  await supabase.rpc('increment_clicks', {
    submission_id: submission.id,
    ip_address: ip,
  });
  const newClicks = (submission.clicks || 0) + 1;

  // 3. Load the artist's fan page data.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, profile_slug, photo_url, bio, instagram, twitter, tiktok, youtube, website')
    .eq('id', submission.artist_id)
    .single();

  const { data: acceptedSongs } = await supabase
    .from('submissions')
    .select(
      'id, song_title, song_link, apple_music_url, audiomack_url, boomplay_url, cover_art_url, playlist:playlists(name, playlist_link)'
    )
    .eq('artist_id', submission.artist_id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  const norm = (s: any): FanSong => ({
    ...s,
    playlist: Array.isArray(s.playlist) ? s.playlist[0] ?? null : s.playlist,
  });
  const songs: FanSong[] = ((acceptedSongs || []) as any[]).map(norm);
  // The clicked song stays featured even if it is not accepted (yet).
  if (!songs.some((s) => s.id === submission.id)) {
    songs.unshift(norm(submission));
  }

  const playlist = submission.playlist as { name: string } | { name: string }[] | null;
  const playlistName = Array.isArray(playlist) ? playlist[0]?.name : playlist?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-green-950 text-white">
      <main className="w-full mx-auto max-w-3xl px-4 py-16 md:py-20">
        {profile ? (
          <ArtistFanPage
            profile={profile as ArtistProfile}
            songs={songs}
            featuredSongId={submission.id}
            viral={{ clicks: newClicks, needed: CLICKS_NEEDED }}
          />
        ) : (
          <div className="text-center">
            <p className="text-green-400 text-sm font-bold uppercase tracking-widest">
              {playlistName || "AfroPitch Playlist"}
            </p>
            <h1 className="text-3xl font-extrabold text-white mt-2">{submission.song_title}</h1>
            <p className="text-xl text-gray-400">by {submission.artist_name}</p>
          </div>
        )}
      </main>
    </div>
  );
}
