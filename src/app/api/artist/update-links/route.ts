import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lets an artist set the streaming-platform URLs + cover art shown on
// their own smart-link page (afropitchplay.best/track/<slug>).
// Ownership is verified: the submission must belong to the caller.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const URL_FIELDS = ["apple_music_url", "audiomack_url", "boomplay_url", "cover_art_url"] as const;

function cleanUrl(v: unknown): string | null {
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
    .select("id, artist_id")
    .eq("id", submission_id)
    .single();
  if (subErr || !sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (sub.artist_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, string | null> = {};
  for (const f of URL_FIELDS) updates[f] = cleanUrl(body[f]);

  const { error: updErr } = await supabase.from("submissions").update(updates).eq("id", submission_id);
  if (updErr) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ ok: true, updates });
}
