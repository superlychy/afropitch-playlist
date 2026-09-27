import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Creates a support ticket from the help-chat widget.
// Logged-in users: ticket is linked to their account.
// Anonymous visitors: must provide an email; ticket is stored with user_id = null
// and contact_email set so support can reply.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { subject, message, name, email } = body || {};

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

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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
            .select("id")
            .single();

        if (error || !ticket) {
            return NextResponse.json({ ok: false, error: "Could not create the ticket." }, { status: 500 });
        }

        await admin.from("support_messages").insert({
            ticket_id: ticket.id,
            sender_id: userId,
            message: fullMessage,
        });

        return NextResponse.json({ ok: true, ticket_id: ticket.id });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: "Could not create the ticket." }, { status: 500 });
    }
}
