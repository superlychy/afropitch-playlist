import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

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
    const body = await req.json();

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
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Try inbound_emails table first
    const { data: emails, error } = await supabase
      .from("inbound_emails")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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
      emails: emails || [],
      count: emails?.length || 0,
      source: "inbound_emails",
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
