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
 * GET: Number of unread inbox messages for the current admin.
 * Counts inbound_emails + contact form messages minus the ones this
 * admin has marked read (inbound_email_read events).
 */
export async function GET(req: Request) {
  try {
    const adminId = await requireAdmin(req);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: inboundIds }, { data: contactIds }, { data: readLogs }] =
      await Promise.all([
        supabase.from("inbound_emails").select("id").order("created_at", { ascending: false }).limit(2000),
        supabase
          .from("system_logs")
          .select("id")
          .eq("event_type", "contact_message")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("system_logs")
          .select("event_data")
          .eq("event_type", "inbound_email_read")
          .eq("user_id", adminId)
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

    const readSet = new Set(
      (readLogs || []).map((l: any) => `${l.event_data?.source}:${l.event_data?.message_id}`)
    );

    let unread = 0;
    for (const r of inboundIds || []) {
      if (!readSet.has(`inbound:${r.id}`)) unread++;
    }
    for (const r of contactIds || []) {
      if (!readSet.has(`contact:${r.id}`)) unread++;
    }

    return NextResponse.json({ success: true, unread });
  } catch (err: any) {
    console.error("Unread count error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
