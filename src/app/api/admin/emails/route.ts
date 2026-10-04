import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

async function requireAdmin(req: Request) {
  // The frontend sends the session as a Bearer token (not cookies) for this route.
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

/**
 * Verify a Resend (Svix) webhook signature.
 * Resend signs with: v1,<base64 hmac-sha256(svix-id.svix-timestamp.rawBody)>
 * using the endpoint's signing secret (whsec_...).
 */
function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  try {
    const svixId = headers.get("svix-id");
    const svixTimestamp = headers.get("svix-timestamp");
    const svixSignature = headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) return false;

    // Reject stale webhooks (5 minute tolerance)
    const ts = parseInt(svixTimestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expected = createHmac("sha256", key).update(signedContent).digest("base64");

    return svixSignature.split(" ").some((sig) => {
      const parts = sig.split(",");
      if (parts.length !== 2 || parts[0] !== "v1") return false;
      const a = Buffer.from(parts[1]);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  } catch {
    return false;
  }
}

/**
 * Resend Inbound Email Webhook.
 *
 * Configure this URL in Resend Dashboard → Inbound Email.
 * When someone replies to an email sent via AfroPitch, this endpoint
 * receives the reply and stores it in the database.
 *
 * Alternative: Use a poll-based approach with GET to check for new emails.
 */
export async function POST(req: Request) {
  try {
    // Verify this really came from Resend (Svix signature). Fail closed.
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const rawBody = await req.text();
    if (
      !webhookSecret ||
      !verifyResendSignature(rawBody, req.headers, webhookSecret)
    ) {
      console.warn("[Admin Emails] Rejected unverified inbound webhook");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Resend inbound webhook payload
    const {
      from,
      to,
      subject,
      text,
      html,
      createdAt,
      messageId,
      raw,
    } = body;

    if (!from || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the user by email (the "to" address or the original recipient)
    const recipientEmail = Array.isArray(to) ? to[0] : to;
    const senderEmail = from;

    // Look up if this is a reply to a support ticket
    // Extract user email from the recipient (format: reply-{ticketId}@resend.com or direct user email)
    let userId: string | null = null;
    let ticketId: string | null = null;

    // Try to find user by sender email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", senderEmail)
      .single();

    if (profile) {
      userId = profile.id;
    }

    // Try to find existing ticket for this user + subject
    if (userId) {
      const { data: existingTicket } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingTicket) {
        ticketId = existingTicket.id;
      }
    }

    // Store the inbound email
    const { error: emailError } = await supabase.from("inbound_emails").insert({
      from_email: senderEmail,
      to_email: recipientEmail,
      subject,
      body_text: text || "",
      body_html: html || "",
      message_id: messageId || null,
      user_id: userId,
      ticket_id: ticketId,
      status: "received",
      created_at: new Date().toISOString(),
    });

    if (emailError && emailError.message.includes("does not exist")) {
      // Table doesn't exist yet — log to system_logs instead
      console.log("Inbound email (no table):", {
        from: senderEmail,
        to: recipientEmail,
        subject,
        body: text?.substring(0, 200),
      });

      await supabase.from("system_logs").insert({
        event_type: "inbound_email",
        event_data: {
          from: senderEmail,
          to: recipientEmail,
          subject,
          body_preview: text?.substring(0, 200) || "",
          status: "received_no_table",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email logged (inbound_emails table pending)",
      });
    }

    // If we found a ticket, add as a support message
    if (ticketId && userId) {
      await supabase.from("support_messages").insert({
        ticket_id: ticketId,
        sender_id: userId,
        message: `📧 Email Reply from ${senderEmail}:\n\n${text || html?.replace(/<[^>]+>/g, "") || "(empty)"}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Inbound email error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET: List recent inbound emails (for admin inbox).
 */
export async function GET(req: Request) {
  try {
    // Admin-only: this returns full inbound email bodies and addresses.
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Try inbound_emails table first
    const { data: emails, error } = await supabase
      .from("inbound_emails")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Also include contact form messages (system_logs contact_message events)
    const { data: contactLogs } = await supabase
      .from("system_logs")
      .select("*")
      .eq("event_type", "contact_message")
      .order("created_at", { ascending: false })
      .limit(limit);

    const contactEmails = (contactLogs || []).map((l: any) => ({
      id: l.id,
      from_email: l.event_data?.sender || "unknown",
      to_email: "contact@afropitchplay.best",
      subject: l.event_data?.subject || "Contact Form",
      body_text: l.event_data?.message || l.event_data?.message_preview || "",
      body_html: "",
      user_id: null,
      ticket_id: null,
      status: "received",
      created_at: l.created_at,
    }));

    const merged = [...(emails || []), ...contactEmails].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit);

    if (error && error.message.includes("does not exist")) {
      // Table doesn't exist yet, return system_logs fallback
      const { data: logs } = await supabase
        .from("system_logs")
        .select("*")
        .eq("event_type", "inbound_email")
        .order("created_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({
        success: true,
        emails: logs || [],
        source: "system_logs",
        table_exists: false,
      });
    }

    return NextResponse.json({
      success: true,
      emails: merged,
      count: merged.length,
      source: "inbound_emails+contact_form",
      table_exists: true,
    });
  } catch (err: any) {
    console.error("List emails error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
