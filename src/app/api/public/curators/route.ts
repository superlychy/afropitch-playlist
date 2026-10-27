import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public curator listings for /playlists, served same-origin so a flaky
// client connection to Supabase can never break the page's public data.
// Runs server-side with the service role; everything returned here is
// already public on the site. The edge caches the response for 60s
// (stale-while-revalidate 5min).
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, role, verification_status, bio, avatar_url, playlists(count)")
            .or("role.eq.curator,role.eq.admin");

        if (error) throw error;

        return NextResponse.json(
            { success: true, curators: data ?? [] },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                },
            }
        );
    } catch (err) {
        console.error("public-curators error:", err);
        return NextResponse.json(
            { success: false, curators: [] },
            { status: 500 }
        );
    }
}
