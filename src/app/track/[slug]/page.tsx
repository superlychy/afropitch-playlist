
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function TrackPage({ params }: { params: { slug: string } }) {
    const supabase = await createClient();
    const { slug } = params;

    if (!slug) {
        return <div>Invalid Link</div>;
    }

    // 1. Fetch Submission and associated Playlist Link
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
        return <div>Link not found or expired.</div>;
    }

    // 2. Increment Clicks (Fire and forget, or await)
    // We await to ensure accuracy.
    await supabase.rpc('increment_clicks', { submission_id: submission.id });

    // 3. Redirect to Playlist Link (preferred) or Song Link (fallback)
    // @ts-ignore
    const targetUrl = submission.playlist?.playlist_link || submission.song_link;
    redirect(targetUrl);
}
