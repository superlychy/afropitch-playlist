import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public homepage widget data: the most recently accepted submissions.
// Runs server-side with the service role so the browser never touches
// profile access rules directly. Everything returned here is already
// public on the site (song pages show the same song, artist and playlist).
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("submissions")
            .select(
                "id, song_title, created_at, artist:profiles!artist_id(full_name), playlist:playlists(name)"
            )
            .eq("status", "accepted")
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        const approvals = (data ?? []).map((row: any) => ({
            id: row.id,
            song_title: row.song_title,
            created_at: row.created_at,
            artist: row.artist ? { full_name: row.artist.full_name } : null,
            playlist: row.playlist ? { name: row.playlist.name } : null,
        }));

        return NextResponse.json({ success: true, approvals });
    } catch (err) {
        console.error("recent-approvals error:", err);
        return NextResponse.json(
            { success: false, approvals: [] },
            { status: 500 }
        );
    }
}
