import { NextResponse } from "next/server";

/**
 * Song Search API — searches Spotify for tracks as the artist types.
 * Falls back to empty results if no Spotify credentials configured.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
    const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!spotifyClientId || !spotifyClientSecret) {
      return NextResponse.json({
        results: [],
        query: q,
        message: "Spotify search not configured — paste link manually",
      });
    }

    // Get Spotify access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${spotifyClientId}:${spotifyClientSecret}`
        ).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ results: [], query: q, error: "Spotify auth failed" });
    }

    const tokenData = await tokenRes.json();

    // Search Spotify
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ results: [], query: q, error: "Search failed" });
    }

    const searchData = await searchRes.json();
    const tracks = searchData.tracks?.items || [];

    const results = tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => a.name).join(", "),
      album: track.album.name,
      albumImage: track.album.images?.[0]?.url || null,
      spotifyUrl: track.external_urls?.spotify || null,
      previewUrl: track.preview_url,
      duration: track.duration_ms,
      isrc: track.external_ids?.isrc || null,
    }));

    return NextResponse.json({ results, query: q });
  } catch (err: any) {
    console.error("Song search error:", err);
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}
