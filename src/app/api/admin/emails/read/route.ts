import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user.id : null;
}

/**
 * POST: Mark an inbox message as read.
 * Body: { source: "inbound" | "contact", message_id: string }
 * Read state is stored as a system_logs event so it is per-admin,
 * cross-device, and needs no schema migration.
 */
export async function POST(req: Request) {
  try {
    const adminId = await requireAdmin(req);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { source, message_id } = await req.json();
    if (!source || !message_id) {
      return NextResponse.json({ error: "source and message_id required" }, { status: 400 });
    }

    // Idempotent: skip if already marked read by this admin.
    const { data: readLogs } = await supabase
      .from("system_logs")
      .select("id, event_data")
      .eq("event_type", "inbound_email_read")
      .eq("user_id", adminId)
      .order("created_at", { ascending: false })
      .limit(2000);
    const isAlready = (readLogs || []).some(
      (l: any) =>
        l.event_data?.source === source &&
        String(l.event_data?.message_id) === String(message_id)
    );
    if (!isAlready) {
      await supabase.from("system_logs").insert({
        event_type: "inbound_email_read",
        event_data: { source, message_id: String(message_id) },
        user_id: adminId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Mark read error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
