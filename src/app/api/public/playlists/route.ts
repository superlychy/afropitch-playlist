import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public playlist listings for /playlists, served same-origin so a flaky
// client connection to Supabase can never break the page's public data.
// Runs server-side with the service role; everything returned here is
// already public on the site. The edge caches the response for 60s
// (stale-while-revalidate 5min); playlist edits take at most a minute to
// show up, which is fine for a browse list.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("playlists")
            .select("*, curator:profiles!curator_id(role, full_name, verification_status)")
            .eq("is_active", true)
            .order("followers", { ascending: false });

        if (error) throw error;

        return NextResponse.json(
            { success: true, playlists: data ?? [] },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                },
            }
        );
    } catch (err) {
        console.error("public-playlists error:", err);
        return NextResponse.json(
            { success: false, playlists: [] },
            { status: 500 }
        );
    }
}
