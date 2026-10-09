import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Logs a ticket-link click for traction metrics. Minimal and non-blocking:
// always returns ok so the ticket flow never breaks.
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
        if (!eventId) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }
        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await admin.from("event_analytics").insert({ event_id: eventId, kind: "ticket_click" });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
