import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Serve cached tracks when the last successful Spotify sync is this fresh.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
// Never let a Spotify call hang the page longer than this.
const SPOTIFY_TIMEOUT_MS = 10_000;

interface CachedTrack {
  name: string;
  artists: string;
  spotify_url: string | null;
  album_image: string | null;
  duration: number;
  isrc: string | null;
}

function fetchWithTimeout(url: string, init: RequestInit = {}, ms = SPOTIFY_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function isFreshCache(syncedAt: string | null): boolean {
  if (!syncedAt) return false;
  return Date.now() - new Date(syncedAt).getTime() < CACHE_TTL_MS;
}

/**
 * POST: Get a playlist's tracks.
 * Body: { playlist_id: string }
 *
 * Serves the cached track list instantly when fresh. Otherwise attempts a
 * live Spotify sync (with timeouts) and refreshes the cache. Falls back to
 * accepted submissions from the DB when Spotify is unreachable, so the
 * page never hangs and never dead-ends.
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

    // 1. Get playlist from DB (including track cache)
    const { data: playlist, error: plErr } = await supabase
      .from("playlists")
      .select("id, name, description, cover_image, followers, playlist_link, curator_id, tracks_cache, tracks_synced_at")
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

    const playlistMatch = spotifyUrl.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (!playlistMatch) {
      return NextResponse.json(
        { error: "Invalid Spotify playlist URL" },
        { status: 400 }
      );
    }
    const spotifyPlaylistId = playlistMatch[1];

    const cachedTracks = (playlist.tracks_cache ?? []) as CachedTrack[];

    // 3. Fresh cache? Serve it instantly — no Spotify call at all.
    if (cachedTracks.length > 0 && isFreshCache(playlist.tracks_synced_at)) {
      return NextResponse.json({
        success: true,
        cached: true,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || "Curated AfroPitch Playlist",
          cover_image: playlist.cover_image,
          followers: playlist.followers || 0,
          playlist_link: spotifyUrl,
        },
        tracks: cachedTracks,
        total_tracks: cachedTracks.length,
        synced_at: playlist.tracks_synced_at,
      });
    }

    // 4. Stale/missing cache: try a live Spotify sync, but never hang.
    let spData: any = null;
    let trackList: CachedTrack[] = [];
    let spError: unknown = null;
    try {
      const tokenRes = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID || ""}:${process.env.SPOTIFY_CLIENT_SECRET || ""}`
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!tokenRes.ok) throw new Error("Failed to authenticate with Spotify");
      const { access_token } = await tokenRes.json();

      const spRes = await fetchWithTimeout(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}?fields=id,name,description,images,tracks(items(track(name,artists(name),external_urls(spotify),album(images),duration_ms,isrc))),followers(total)`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (!spRes.ok) {
        const errText = await spRes.text().catch(() => "");
        throw new Error(`Spotify API error: ${errText.slice(0, 120)}`);
      }

      spData = await spRes.json();
      const tracks = spData.tracks?.items || [];

      trackList = tracks
        .filter((item: any) => item.track)
        .map((item: any) => ({
          name: item.track.name,
          artists: item.track.artists.map((a: any) => a.name).join(", "),
          spotify_url: item.track.external_urls?.spotify ?? null,
          album_image: item.track.album?.images?.[0]?.url ?? null,
          duration: item.track.duration_ms ?? 0,
          isrc: item.track.external_ids?.isrc ?? null,
        }));

      if (trackList.length === 0) throw new Error("Spotify returned no tracks");

      // 5. Refresh the cache + playlist metadata
      await supabase
        .from("playlists")
        .update({
          name: spData.name || playlist.name,
          description: spData.description || "",
          cover_image: spData.images?.[0]?.url || null,
          followers: spData.followers?.total || 0,
          tracks_cache: trackList,
          tracks_synced_at: new Date().toISOString(),
        })
        .eq("id", playlist_id);
    } catch (e) {
      console.warn("Spotify sync failed, falling back to cache/database.", e);
      spError = e;
    }

    // 6. Spotify failed: prefer a stale cache over nothing.
    if (spError && cachedTracks.length > 0) {
      return NextResponse.json({
        success: true,
        cached: true,
        stale: true,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || "Curated AfroPitch Playlist",
          cover_image: playlist.cover_image,
          followers: playlist.followers || 0,
          playlist_link: spotifyUrl,
        },
        tracks: cachedTracks,
        total_tracks: cachedTracks.length,
        synced_at: playlist.tracks_synced_at,
      });
    }

    // 7. No cache at all: fall back to accepted submissions from our DB.
    if (spError || trackList.length === 0) {
      const { data: existingSubs } = await supabase
        .from("submissions")
        .select("id, song_title, artist_name, tracking_slug, clicks")
        .eq("playlist_id", playlist_id)
        .eq("status", "accepted");

      trackList = (existingSubs || []).map((sub) => ({
        name: sub.song_title,
        artists: sub.artist_name || "Accepted Artist",
        spotify_url: sub.tracking_slug ? `/track/${sub.tracking_slug}` : spotifyUrl,
        album_image: null,
        duration: 0,
        isrc: null,
      }));
    }

    // 8. Return tracks for the playlist page to display
    return NextResponse.json({
      success: true,
      cached: false,
      playlist: {
        id: playlist.id,
        name: spData?.name || playlist.name,
        description: spData?.description || "Curated AfroPitch Playlist",
        cover_image: spData?.images?.[0]?.url || playlist.cover_image,
        followers: spData?.followers?.total || playlist.followers || 0,
        playlist_link: spotifyUrl,
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
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
