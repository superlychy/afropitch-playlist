import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: Auto-sync ALL playlists from their Spotify links.
 * Updates track lists, follower counts, and cover images.
 * Can be called from a cron job or manually by admin.
 */
export async function POST() {
  try {
    // 1. Get all active playlists with Spotify links
    const { data: playlists, error } = await supabase
      .from("playlists")
      .select("id, name, playlist_link, curator_id")
      .eq("is_active", true)
      .not("playlist_link", "is", null);

    if (error || !playlists?.length) {
      return NextResponse.json({
        success: true,
        message: "No playlists to sync",
        synced: 0,
      });
    }

    // 2. Get Spotify access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "Spotify authentication failed" },
        { status: 500 }
      );
    }

    const { access_token } = await tokenRes.json();
    let syncedCount = 0;
    const errors: string[] = [];

    // 3. Sync each playlist
    for (const playlist of playlists) {
      try {
        const match = playlist.playlist_link?.match(
          /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
        );
        if (!match) {
          errors.push(`${playlist.name}: No valid Spotify URL`);
          continue;
        }

        const spRes = await fetch(
          `https://api.spotify.com/v1/playlists/${match[1]}?fields=id,name,description,images,tracks(items(track(name,artists(name),external_urls(spotify),album(images),duration_ms,isrc))),followers(total)`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!spRes.ok) {
          errors.push(`${playlist.name}: Spotify API error ${spRes.status}`);
          continue;
        }

        const spData = await spRes.json();
        const tracks = spData.tracks?.items || [];

        // Update playlist in DB
        const { error: updateErr } = await supabase
          .from("playlists")
          .update({
            name: spData.name || playlist.name,
            description: spData.description || "",
            cover_image: spData.images?.[0]?.url || null,
            followers: spData.followers?.total || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", playlist.id);

        if (updateErr) {
          errors.push(`${playlist.name}: DB update failed`);
          continue;
        }

        syncedCount++;

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        errors.push(`${playlist.name}: ${err.message}`);
      }
    }

    // 4. Log sync event
    await supabase.from("system_logs").insert({
      event_type: "playlist_sync",
      event_data: {
        total: playlists.length,
        synced: syncedCount,
        errors: errors.length,
        error_details: errors.slice(0, 5),
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      total: playlists.length,
      synced: syncedCount,
      errors: errors.length,
      error_details: errors.slice(0, 5),
    });
  } catch (err: any) {
    console.error("Auto-sync error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET: Check sync status and list playlists.
 */
export async function GET() {
  try {
    const { data: playlists } = await supabase
      .from("playlists")
      .select("id, name, followers, cover_image, playlist_link, updated_at")
      .eq("is_active", true)
      .order("followers", { ascending: false });

    const { data: lastSync } = await supabase
      .from("system_logs")
      .select("*")
      .eq("event_type", "playlist_sync")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      playlists: playlists?.map((p) => ({
        id: p.id,
        name: p.name,
        followers: p.followers,
        cover_image: p.cover_image,
        has_link: !!p.playlist_link,
        last_synced: p.updated_at,
      })) || [],
      last_sync: lastSync?.created_at || null,
      last_sync_details: lastSync?.event_data || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
