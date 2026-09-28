import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Tracked outbound redirect for Spotify links.
// Validates the destination (open-redirect protection), logs the click
// best-effort, then 302s to Spotify. Never blocks the redirect on a DB error.
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
  if (!/^(open|www)\.spotify\.com$/.test(dest.hostname)) {
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
  } catch {
    // Logging must never break the redirect.
  }

  return NextResponse.redirect(dest.toString(), 302);
}
