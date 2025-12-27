import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Preferably with Service Role if available, else Anon)
// Note: For public tracking to work without Service Role, we need an RPC function or Public RLS.
// We will assume an RPC function `increment_submission_clicks` exists.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using Anon for now
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
    request: Request,
    context: { params: Promise<{ slug: string }> } // Await params
) {
    const { slug } = await context.params;

    if (!slug) {
        return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    // 1. Call RPC to increment clicks and return the target URL (song_link)
    // We'll create this RPC in the migration.
    // It should returns { song_link } or null

    // First, let's try to just fetch the link if RPC isn't used for fetching.
    // But due to RLS, fetching might fail for public users.
    // So RPC is best: `get_and_track_submission(slug_input)` returns url.

    const { data, error } = await supabase
        .rpc('track_submission_click', { slug_input: slug });

    if (error || !data) {
        console.error("Tracking Error:", error);
        return NextResponse.json(
            { error: 'Link not found or expired', details: error?.message },
            { status: 404 }
        );
    }

    // data should be the song_link string
    const targetUrl = data as string;

    // 2. Redirect
    // Ensure protocol exists
    const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

    return NextResponse.redirect(finalUrl);
}
