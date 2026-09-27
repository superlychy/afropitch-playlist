import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// GET: message thread for the visitor who opened a ticket.
// Auth: either the ticket's access_token (anonymous visitors) or the logged-in
// ticket owner. Returns only the conversation — no contact details.
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const ticketId = searchParams.get("ticket_id");
        const accessToken = searchParams.get("token");
        if (!ticketId) {
            return NextResponse.json({ ok: false, error: "ticket_id is required." }, { status: 400 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: ticket, error: tErr } = await admin
            .from("support_tickets")
            .select("id, user_id, access_token, subject, status, created_at")
            .eq("id", ticketId)
            .single();
        if (tErr || !ticket) {
            return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const isOwner = !!user && ticket.user_id === user.id;
        const hasToken = !!accessToken && ticket.access_token === accessToken;
        if (!isOwner && !hasToken) {
            return NextResponse.json({ ok: false, error: "Not authorized for this ticket." }, { status: 403 });
        }

        const { data: messages, error } = await admin
            .from("support_messages")
            .select("id, message, sender_id, created_at")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });
        if (error) {
            return NextResponse.json({ ok: false, error: "Could not load thread." }, { status: 500 });
        }

        const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id).filter(Boolean))];
        let adminIds = new Set<string>();
        if (senderIds.length > 0) {
            const { data: profs } = await admin
                .from("profiles")
                .select("id")
                .in("id", senderIds)
                .eq("role", "admin");
            adminIds = new Set((profs || []).map((p: any) => p.id));
        }

        return NextResponse.json({
            ok: true,
            ticket: { id: ticket.id, subject: ticket.subject, status: ticket.status },
            messages: (messages || []).map((m: any) => ({
                id: m.id,
                message: m.message,
                created_at: m.created_at,
                from_admin: !!m.sender_id && adminIds.has(m.sender_id),
            })),
        });
    } catch {
        return NextResponse.json({ ok: false, error: "Could not load thread." }, { status: 500 });
    }
}
