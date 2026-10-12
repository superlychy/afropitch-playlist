import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSpotifyArtwork } from "@/lib/spotifyArt";

const VALID_HOSTS = new Set([
  "open.spotify.com",
  "spotify.com",
  "music.apple.com",
  "audiomack.com",
  "www.audiomack.com",
  "soundcloud.com",
  "www.soundcloud.com",
  "boomplay.com",
  "www.boomplay.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "music.youtube.com",
  "www.music.youtube.com",
]);

function isValidSongLink(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.toLowerCase();
    if (!["http:", "https:"].includes(u.protocol)) return false;
    return [...VALID_HOSTS].some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Per-field official hosts for the optional platform links (same allowlist
// as the dashboard editor). Prevents a phishing URL being saved as e.g.
// the "Apple Music" link shown on the public song page.
const FIELD_HOSTS: Record<string, Set<string>> = {
  apple_music_url: new Set(["music.apple.com"]),
  audiomack_url: new Set(["audiomack.com", "www.audiomack.com"]),
  boomplay_url: new Set(["boomplay.com", "www.boomplay.com"]),
  deezer_url: new Set(["deezer.com", "www.deezer.com"]),
  youtube_music_url: new Set(["music.youtube.com", "www.music.youtube.com"]),
};

function cleanPlatformUrl(v: unknown, hosts: Set<string>): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!hosts.has(u.hostname.toLowerCase())) return null;
  return t.slice(0, 500);
}

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
    const { playlist_ids, song_title, artist_name, song_link, tier, platform_links } = body;

    if (!playlist_ids?.length || !song_title || !song_link || !artist_name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate song link format (hostname check, not substring).
    if (!isValidSongLink(String(song_link))) {
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
        not_artist: ["Curators cannot submit songs.", 403],
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

    // Optional platform links (fan page): attached to the just-created
    // submissions with a follow-up update using the service role, because
    // artists have no direct UPDATE grant on submissions. The money RPC is
    // untouched. Each link is host-validated so a wrong-host URL is rejected
    // rather than silently dropped. Best effort: a failure here must never
    // fail the submission itself.
    try {
      const pl = platform_links || {};
      const map: Record<string, string> = {
        apple: "apple_music_url",
        audiomack: "audiomack_url",
        boomplay: "boomplay_url",
        deezer: "deezer_url",
        youtubeMusic: "youtube_music_url",
      };
      const clean: Record<string, string> = {};
      const rejected: string[] = [];
      for (const [key, col] of Object.entries(map)) {
        const raw = pl[key];
        if (raw == null || String(raw).trim() === "") continue;
        const ok = cleanPlatformUrl(raw, FIELD_HOSTS[col]);
        if (ok) clean[col] = ok;
        else rejected.push(key);
      }
      if (Object.keys(clean).length > 0) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { error: linkErr } = await admin
          .from("submissions")
          .update(clean)
          .eq("artist_id", user.id)
          .eq("song_link", song_link)
          .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
        if (linkErr) console.error("submit platform-link attach failed:", linkErr);
      }
      if (rejected.length > 0) {
        console.warn("submit rejected platform links (wrong host):", rejected);
      }
    } catch (e) {
      // Non-fatal: links can be added later from the dashboard.
      console.error("submit platform-link attach error:", e);
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
