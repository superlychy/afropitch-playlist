import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

// Interested / Not interested votes for events (traction metric).
// voter_key = the logged-in user id, or an anonymous id stored in a cookie
// so logged-out visitors can vote once per event too.

const ANON_COOKIE = "ap_event_voter";

async function getVoterKey(): Promise<{ key: string; anonId: string | null }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (user) return { key: `user:${user.id}`, anonId: null };

    const jar = await cookies();
    let anonId = jar.get(ANON_COOKIE)?.value;
    if (!anonId) anonId = randomUUID();
    return { key: `anon:${anonId}`, anonId };
}

function admin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function counts(db: ReturnType<typeof admin>, eventId: string) {
    const { data } = await db
        .from("event_interest")
        .select("value")
        .eq("event_id", eventId);
    let interested = 0;
    let notInterested = 0;
    for (const r of data ?? []) {
        if (r.value === "interested") interested++;
        else notInterested++;
    }
    return { interested, not_interested: notInterested };
}

export async function GET(req: NextRequest) {
    try {
        const eventId = new URL(req.url).searchParams.get("event_id")?.trim() ?? "";
        if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });
        const db = admin();
        const c = await counts(db, eventId);
        const { key } = await getVoterKey();
        const { data: mine } = await db
            .from("event_interest")
            .select("value")
            .eq("event_id", eventId)
            .eq("voter_key", key)
            .maybeSingle();
        return NextResponse.json({ ok: true, ...c, mine: mine?.value ?? null });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
        const value = body.value;
        if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });
        if (value !== "interested" && value !== "not_interested" && value !== null) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }
        const db = admin();
        const { key, anonId } = await getVoterKey();

        if (value === null) {
            await db.from("event_interest").delete().eq("event_id", eventId).eq("voter_key", key);
        } else {
            await db.from("event_interest").upsert(
                { event_id: eventId, voter_key: key, value },
                { onConflict: "event_id,voter_key" }
            );
        }
        const c = await counts(db, eventId);
        const res = NextResponse.json({ ok: true, ...c, mine: value });
        if (anonId) {
            res.cookies.set(ANON_COOKIE, anonId, {
                maxAge: 60 * 60 * 24 * 365,
                path: "/",
                sameSite: "lax",
            });
        }
        return res;
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
