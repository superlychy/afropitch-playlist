export const dynamic = 'force-dynamic';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

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
    .select('song_title, artist_name, song_link, playlist:playlists(name)')
    .eq('tracking_slug', slug)
    .single();

  if (!sub) return { title: 'AfroPitch - Link Not Found' };

  const playlistName = Array.isArray(sub.playlist) ? sub.playlist[0]?.name : sub.playlist?.name;
  
  return {
    title: `🎵 ${sub.song_title} by ${sub.artist_name} | AfroPitch`,
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

  // 1. Fetch Submission with full details
  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      id, song_title, artist_name, song_link, clicks,
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

  // 2. Increment Clicks
  const { headers } = await import('next/headers');
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');

  await supabase.rpc('increment_clicks', {
    submission_id: submission.id,
    ip_address: ip,
  });

  // 3. Get new click count for trending progress
  const newClicks = (submission.clicks || 0) + 1;
  const clicksNeeded = 100;
  const progress = Math.min(Math.round((newClicks / clicksNeeded) * 100), 100);
  const isTrending = newClicks >= clicksNeeded;

  // 4. Resolve Target URL
  let rawUrl = Array.isArray(submission.playlist)
    ? submission.playlist[0]?.playlist_link
    : (submission.playlist as any)?.playlist_link || submission.song_link;

  if (!rawUrl) rawUrl = submission.song_link;

  if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl;
  }

  // 5. For GET requests, show the landing page before redirecting
  // This lets the artist see click counts and share their link
  const playlistName = Array.isArray(submission.playlist)
    ? submission.playlist[0]?.name
    : (submission.playlist as any)?.name;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-green-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">
        {/* Song Info */}
        <div className="space-y-3">
          <p className="text-green-400 text-sm font-bold uppercase tracking-widest">
            {playlistName || "AfroPitch Playlist"}
          </p>
          <h1 className="text-3xl font-extrabold text-white">{submission.song_title}</h1>
          <p className="text-xl text-gray-400">by {submission.artist_name}</p>
        </div>

        {/* Trending Progress */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Viral Progress</span>
            <span className={`font-bold ${isTrending ? "text-yellow-400" : "text-green-400"}`}>
              {newClicks}/{clicksNeeded} Clicks
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
          {isTrending && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold animate-pulse">
              <span>🔥</span> TRENDING <span>🔥</span>
            </div>
          )}
          {!isTrending && (
            <p className="text-xs text-gray-500">
              Share this link to boost your ranking! {clicksNeeded - newClicks} more clicks to trend.
            </p>
          )}
        </div>

        {/* Share Buttons */}
        <div className="flex justify-center gap-4">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `Check out "${submission.song_title}" by ${submission.artist_name} on AfroPitch! 🎵`
            )}&url=${encodeURIComponent(`https://afropitchplay.best/track/${slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105"
          >
            Share on X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Check out "${submission.song_title}" by ${submission.artist_name}! 🎵 https://afropitchplay.best/track/${slug}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105"
          >
            Share on WhatsApp
          </a>
        </div>

        {/* Stream Now Button (redirects to playlist) */}
        {rawUrl && (
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-xl shadow-green-500/20 hover:shadow-green-500/40 transition-all hover:scale-105"
          >
            🎧 Stream Now
          </a>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-600">
          Powered by <span className="text-green-600 font-bold">AfroPitch</span>
        </p>
      </div>
    </div>
  );
}
