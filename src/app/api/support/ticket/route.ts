import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Creates a support ticket from the help-chat widget.
// Logged-in users: ticket is linked to their account.
// Anonymous visitors: must provide an email; ticket is stored with user_id = null
// and contact_email set so support can reply.
//
// Also accepts follow-up messages on an existing ticket:
//   { ticket_id, access_token, message }  (anonymous, token from ticket creation)
//   { ticket_id, message }                (logged-in owner of the ticket)
// A follow-up reopens the ticket so it lands back in the admin queue.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { subject, message, name, email, ticket_id, access_token, agent_escalation } = body || {};

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ---- Follow-up on an existing ticket ----
        if (ticket_id) {
            const cleanMsg = String(message || "").trim();
            if (!cleanMsg || cleanMsg.length > 5000) {
                return NextResponse.json({ ok: false, error: "Message is required (max 5000 chars)." }, { status: 400 });
            }

            const { data: ticket, error: tErr } = await admin
                .from("support_tickets")
                .select("id, user_id, access_token")
                .eq("id", ticket_id)
                .single();
            if (tErr || !ticket) {
                return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
            }

            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const isOwner = !!user && ticket.user_id === user.id;
            const hasToken = !!access_token && ticket.access_token === access_token;
            if (!isOwner && !hasToken) {
                return NextResponse.json({ ok: false, error: "Not authorized for this ticket." }, { status: 403 });
            }

            const { error: mErr } = await admin.from("support_messages").insert({
                ticket_id: ticket.id,
                sender_id: user?.id ?? null,
                message: cleanMsg,
            });
            if (mErr) {
                return NextResponse.json({ ok: false, error: "Could not send the message." }, { status: 500 });
            }
            // Reopen so the admin inbox surfaces it again.
            await admin.from("support_tickets").update({ status: "open" }).eq("id", ticket.id);
            return NextResponse.json({ ok: true, ticket_id: ticket.id });
        }

        // ---- New ticket ----
        if (!subject?.trim() || !message?.trim()) {
            return NextResponse.json({ ok: false, error: "Subject and message are required." }, { status: 400 });
        }
        if (subject.trim().length > 200 || message.trim().length > 5000) {
            return NextResponse.json({ ok: false, error: "Message is too long." }, { status: 400 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        let userId: string | null = user?.id ?? null;
        let contactEmail: string | null = null;

        if (!userId) {
            const cleanEmail = String(email || "").trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
            }
            contactEmail = cleanEmail;
        }

        const fullMessage = userId
            ? message.trim()
            : `From: ${String(name || "Website visitor").trim()} <${contactEmail}>\n\n${message.trim()}`;

        const { data: ticket, error } = await admin
            .from("support_tickets")
            .insert({
                user_id: userId,
                subject: subject.trim(),
                message: fullMessage,
                status: "open",
                contact_email: contactEmail,
            })
            .select("id, access_token")
            .single();

        if (error || !ticket) {
            return NextResponse.json({ ok: false, error: "Could not create the ticket." }, { status: 500 });
        }

        // Agent escalations: the chat transcript is context for the team only.
        // It is stored as a marked system row the admin sees, but the visitor's
        // thread (visitor-thread route) filters marked rows out and shows a
        // short team handoff note instead of the whole transcript blob.
        const threadRows = agent_escalation
            ? [
                {
                    ticket_id: ticket.id,
                    sender_id: null,
                    message: `Agent transcript (team only)\n${fullMessage}`,
                },
                {
                    ticket_id: ticket.id,
                    sender_id: null,
                    message: `[[team-note]]This conversation has been passed to the AfroPitch team. They will reply here and by email.`,
                },
            ]
            : [{
                ticket_id: ticket.id,
                sender_id: userId,
                message: fullMessage,
            }];

        const { error: messageError } = await admin.from("support_messages").insert(threadRows);

        if (messageError) {
            // Ticket exists but the thread starter failed — log loudly, don't pretend all is well.
            await admin.from("system_logs").insert({
                event_type: "support_ticket_message_failed",
                event_data: { ticket_id: ticket.id, error: messageError.message },
            });
        }

        return NextResponse.json({ ok: true, ticket_id: ticket.id, access_token: ticket.access_token });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: "Could not create the ticket." }, { status: 500 });
    }
}
