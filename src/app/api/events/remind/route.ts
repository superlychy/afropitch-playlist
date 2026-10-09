import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getEventVoterKey, EVENT_VOTER_COOKIE } from "@/lib/event-voter";

// Saves an email reminder for an event (offered after an "Interested" vote).
// One reminder per voter per event.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!eventId || !EMAIL_RE.test(email)) {
            return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
        }
        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: event } = await admin
            .from("events")
            .select("id, starts_at")
            .eq("id", eventId)
            .eq("status", "published")
            .single();
        if (!event) {
            return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
        }
        if (new Date(event.starts_at).getTime() < Date.now()) {
            return NextResponse.json({ ok: false, error: "This event has already started." }, { status: 400 });
        }
        const { key, anonId } = await getEventVoterKey();
        const { error } = await admin.from("event_reminders").upsert(
            { event_id: eventId, email, voter_key: key },
            { onConflict: "event_id,voter_key" }
        );
        if (error) {
            return NextResponse.json({ ok: false, error: "Could not save the reminder." }, { status: 500 });
        }
        const res = NextResponse.json({ ok: true });
        if (anonId) {
            res.cookies.set(EVENT_VOTER_COOKIE, anonId, {
                maxAge: 60 * 60 * 24 * 365,
                path: "/",
                sameSite: "lax",
            });
        }
        return res;
    } catch {
        return NextResponse.json({ ok: false, error: "Could not save the reminder." }, { status: 500 });
    }
}
