
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function TrackPage({ params }: { params: { slug: string } }) {
    const supabase = await createClient();
    // Await params for Next.js 15+ compat (and safe for 14)
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

    // 1. Fetch Submission
    const { data: submission, error } = await supabase
        .from('submissions')
        .select(`
            id, 
            song_link, 
            clicks,
            playlist:playlists (
                playlist_link
            )
        `)
        .eq('tracking_slug', slug)
        .single();

    if (error || !submission) {
        console.error("Tracker Error:", error);
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500">Link Expired</h1>
                    <p className="text-gray-400 text-sm mt-2">We could not find this tracking link.</p>
                </div>
            </div>
        );
    }

    // 2. Increment Clicks (Safe increment with IP tracking)
    const { headers } = await import('next/headers');
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const realIp = headerList.get('x-real-ip');
    // Basic IP extraction (first IP in list if comma-separated)
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');

    await supabase.rpc('increment_clicks', {
        submission_id: submission.id,
        ip_address: ip
    });

    // 3. Resolve Target URL
    // @ts-ignore - Handle potential array or object return style safely
    let rawUrl = submission.playlist?.playlist_link || (Array.isArray(submission.playlist) ? submission.playlist[0]?.playlist_link : null) || submission.song_link;

    if (!rawUrl) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-yellow-500">Destination Missing</h1>
                    <p className="text-gray-400 text-sm mt-2">This submission has no valid playlist or song link.</p>
                </div>
            </div>
        );
    }

    // 4. Ensure Protocol (fix "Invalid Link" if protocol missing)
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
    }

    // 5. Redirect
    redirect(rawUrl);
}
