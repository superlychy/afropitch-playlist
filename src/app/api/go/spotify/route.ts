import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Tracked outbound redirect for streaming-platform links.
// Validates the destination against an explicit allowlist (open-redirect
// protection), logs the click best-effort, bumps the submission's stream
// counter (IP-deduped), then 302s. Never blocks the redirect on a DB error.
const ALLOWED_HOSTS = new Set([
  "open.spotify.com",
  "www.spotify.com",
  "music.apple.com",
  "audiomack.com",
  "www.audiomack.com",
  "boomplay.com",
  "www.boomplay.com",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") || "";
  const kind = req.nextUrl.searchParams.get("kind") || "link";
  const ref = req.nextUrl.searchParams.get("ref");

  let dest: URL;
  try {
    dest = new URL(to);
  } catch {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(dest.hostname)) {
    return NextResponse.json({ error: "Destination not allowed" }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("spotify_clicks").insert({
      url: to.slice(0, 500),
      kind: kind.slice(0, 20),
      ref_id: ref?.slice(0, 100) ?? null,
      source: req.headers.get("referer")?.slice(0, 300) ?? null,
    });
    // Count it as a stream on the submission (IP-deduped firewall RPC).
    if (ref && UUID_RE.test(ref)) {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") || "unknown");
      await supabase.rpc("increment_clicks", { submission_id: ref, ip_address: ip });
    }
  } catch {
    // Logging must never break the redirect.
  }

  return NextResponse.redirect(dest.toString(), 302);
}
