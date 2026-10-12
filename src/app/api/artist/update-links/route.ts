import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSpotifyArtwork } from "@/lib/spotifyArt";

// Lets an artist set the streaming-platform URLs + cover art shown on
// their own smart-link page (/track/<slug>).
// Ownership is verified: the submission must belong to the caller.
// Platform URLs are restricted to their official hosts (no arbitrary
// redirect targets). After saving, the cached public track page is
// revalidated so the new links show immediately.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function cleanGenericUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  if (!/^https?:\/\/.+/i.test(t)) return null;
  return t.slice(0, 500);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const { submission_id } = body;
  if (!submission_id) return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });

  // Ownership check
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, artist_id, tracking_slug, song_link, cover_art_url")
    .eq("id", submission_id)
    .single();
  if (subErr || !sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (sub.artist_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only fields the client actually sent are touched: an absent key means
  // "leave as-is". An explicit empty string clears the link. A present but
  // invalid URL is rejected per-field (reported, never nulled), so a typo
  // can never erase a good link while the UI claims success.
  const updates: Record<string, string | null> = {};
  const fieldErrors: Record<string, string> = {};
  for (const [field, hosts] of Object.entries(FIELD_HOSTS)) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (typeof raw === "string" && raw.trim() === "") {
      updates[field] = null;
      continue;
    }
    const ok = cleanPlatformUrl(raw, hosts);
    if (ok) updates[field] = ok;
    else fieldErrors[field] = "That is not a valid link for this platform.";
  }
  if ("cover_art_url" in body) {
    const raw = body.cover_art_url;
    if (typeof raw === "string" && raw.trim() === "") {
      updates.cover_art_url = null;
    } else {
      const art = cleanGenericUrl(raw);
      if (art) updates.cover_art_url = art;
      else fieldErrors.cover_art_url = "That is not a valid URL.";
    }
  }

  if (Object.keys(updates).length > 0) {
    // Backfill cover art from the Spotify link when the artist didn't supply one.
    if (!("cover_art_url" in updates) && !sub.cover_art_url && sub.song_link) {
      const art = await getSpotifyArtwork(sub.song_link);
      if (art) updates.cover_art_url = art;
    }

    const { error: updErr } = await supabase.from("submissions").update(updates).eq("id", submission_id);
    if (updErr) return NextResponse.json({ error: "Update failed" }, { status: 500 });

    // Bust the edge cache so the public page shows the new links right away.
    if (sub.tracking_slug) {
      revalidatePath(`/track/${sub.tracking_slug}`);
    }
  }

  return NextResponse.json({ ok: true, updates, fieldErrors });
}
