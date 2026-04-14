import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: Sync a playlist's tracks from Spotify.
 * Body: { playlist_id: string }
 *
 * Fetches the playlist's Spotify link, pulls all tracks,
 * and updates the database with the latest info.
 */
export async function POST(req: Request) {
  try {
    const { playlist_id } = await req.json();

    if (!playlist_id) {
      return NextResponse.json(
        { error: "playlist_id is required" },
        { status: 400 }
      );
    }

    // 1. Get playlist from DB
    const { data: playlist, error: plErr } = await supabase
      .from("playlists")
      .select("id, name, playlist_link, curator_id")
      .eq("id", playlist_id)
      .single();

    if (plErr || !playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    // 2. Extract Spotify playlist URL
    const spotifyUrl = playlist.playlist_link;
    if (!spotifyUrl || !spotifyUrl.includes("spotify.com")) {
      return NextResponse.json(
        { error: "Playlist has no Spotify link", playlist_link: spotifyUrl },
        { status: 400 }
      );
    }

    // Parse Spotify playlist ID from URL
    const playlistMatch = spotifyUrl.match(
      /spotify\.com\/playlist\/([a-zA-Z0-9]+)/
    );
    if (!playlistMatch) {
      return NextResponse.json(
        { error: "Invalid Spotify playlist URL" },
        { status: 400 }
      );
    }
    const spotifyPlaylistId = playlistMatch[1];

    // 3. Get Spotify access token
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
        { error: "Failed to authenticate with Spotify" },
        { status: 500 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 4. Fetch playlist details from Spotify
    const spRes = await fetch(
      `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}?fields=id,name,description,images,tracks(items(track(name,artists(name),external_urls(spotify),album(images),duration_ms,isrc))),followers(total)`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!spRes.ok) {
      const errText = await spRes.text();
      return NextResponse.json(
        { error: "Spotify API error", details: errText },
        { status: 500 }
      );
    }

    const spData = await spRes.json();
    const tracks = spData.tracks?.items || [];

    // 5. Update playlist metadata
    await supabase
      .from("playlists")
      .update({
        name: spData.name || playlist.name,
        description: spData.description || "",
        cover_image: spData.images?.[0]?.url || null,
        followers: spData.followers?.total || 0,
      })
      .eq("id", playlist_id);

    // 6. Fetch existing submissions for this playlist
    const { data: existingSubs } = await supabase
      .from("submissions")
      .select("id, song_title, artist_name, tracking_slug, clicks")
      .eq("playlist_id", playlist_id)
      .eq("status", "accepted");

    // 7. Map tracks to submissions (match by title/artist)
    const trackList = tracks
      .filter((item: any) => item.track)
      .map((item: any) => ({
        name: item.track.name,
        artists: item.track.artists.map((a: any) => a.name).join(", "),
        spotify_url: item.track.external_urls?.spotify,
        album_image: item.track.album?.images?.[0]?.url,
        duration: item.track.duration_ms,
        isrc: item.track.external_ids?.isrc,
      }));

    // 8. Return tracks for the playlist page to display
    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: spData.name || playlist.name,
        description: spData.description,
        cover_image: spData.images?.[0]?.url,
        followers: spData.followers?.total,
      },
      tracks: trackList,
      total_tracks: trackList.length,
      synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Sync playlist error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET: List all playlists with their latest sync status.
 */
export async function GET() {
  try {
    const { data: playlists, error } = await supabase
      .from("playlists")
      .select("id, name, genre, followers, cover_image, playlist_link, type")
      .eq("is_active", true)
      .order("followers", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      playlists: playlists || [],
      count: playlists?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
