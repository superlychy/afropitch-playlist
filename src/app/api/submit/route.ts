import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase-server";
import { getSpotifyArtwork } from "@/lib/spotifyArt";

const VALID_DOMAINS = [
  "open.spotify.com",
  "spotify.com",
  "music.apple.com",
  "audiomack.com",
  "soundcloud.com",
  "boomplay.com",
  "youtube.com",
  "youtu.be",
];

export async function POST(req: Request) {
  try {
    // Authenticate the caller; never trust a client-supplied user id.
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please login to submit." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { playlist_ids, song_title, artist_name, song_link, tier } = body;

    if (!playlist_ids?.length || !song_title || !song_link || !artist_name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate song link format
    const linkUrl = String(song_link).toLowerCase();
    if (!VALID_DOMAINS.some((d) => linkUrl.includes(d))) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please use a valid link from Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, or YouTube.",
        },
        { status: 400 }
      );
    }

    // All pricing, balance checks, deduction, submission inserts, and referral
    // qualification happen atomically inside the RPC. The RPC identifies the
    // caller via auth.uid(), so it is called on the user's own session client
    // (not the service role). Any client-supplied total is ignored: the
    // server prices every playlist itself.

    // Best-effort cover art: fetched from Spotify's public oEmbed endpoint so
    // review queue cards can show the real artwork. A failure here must never
    // fail the submission, so it is guarded by try/catch inside and out.
    let art: string | null = null;
    try {
      art = await getSpotifyArtwork(song_link);
    } catch {
      art = null;
    }

    const { data, error } = await auth.rpc("submit_with_payment", {
      p_playlist_ids: playlist_ids,
      p_song_title: song_title,
      p_artist_name: artist_name,
      p_song_link: song_link,
      p_tier: tier || "standard",
      p_cover_art_url: art,
    });

    if (error) {
      console.error("submit_with_payment RPC error:", error);
      return NextResponse.json(
        { success: false, error: "An unexpected error occurred" },
        { status: 500 }
      );
    }

    if (!data || data.ok !== true) {
      const errMap: Record<string, [string, number]> = {
        not_authenticated: ["Please login to submit.", 401],
        missing_playlists: ["Missing required fields", 400],
        missing_fields: ["Missing required fields", 400],
        profile_not_found: ["User profile not found", 404],
        duplicate: [
          "You've already submitted this song to one of the selected playlists.",
          409,
        ],
        insufficient: ["Insufficient balance", 400],
      };
      const [message, status] = errMap[data?.error] || [
        "An unexpected error occurred",
        500,
      ];
      return NextResponse.json(
        { success: false, error: message },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      charged_total: data.charged_total,
      from_referral: data.from_referral,
      from_wallet: data.from_wallet,
      referral_qualified: data.referral_qualified,
    });
  } catch (err: any) {
    console.error("Submission API error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
