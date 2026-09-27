import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

function admin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function tokenFrom(req: NextRequest): Promise<string | null> {
    // One-click unsubscribe (Gmail etc.) POSTs to the List-Unsubscribe URL
    // with the token in the query string; the web form sends JSON.
    const q = req.nextUrl.searchParams.get("token");
    if (q) return q;
    try {
        const body = await req.json();
        return typeof body?.token === "string" ? body.token : null;
    } catch {
        return null;
    }
}

// GET verifies a token and returns the masked email (no mutation).
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });
    const email = await verifyUnsubscribeToken(token);
    if (!email) return NextResponse.json({ ok: false }, { status: 400 });
    const [local, domain] = email.split("@");
    const masked = `${local.slice(0, 2)}***@${domain}`;
    const { data } = await admin()
        .from("email_unsubscribes")
        .select("email")
        .eq("email", email)
        .maybeSingle();
    return NextResponse.json({ ok: true, email: masked, unsubscribed: !!data });
}

// POST unsubscribes (or resubscribes) the address behind a valid token.
export async function POST(req: NextRequest) {
    const token = await tokenFrom(req);
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });
    const email = await verifyUnsubscribeToken(token);
    if (!email) return NextResponse.json({ ok: false }, { status: 400 });

    let action = "unsubscribe";
    try {
        const body = await req.clone().json();
        if (body?.action === "resubscribe") action = "resubscribe";
    } catch {
        /* one-click POST has no body */
    }

    const db = admin();
    if (action === "resubscribe") {
        await db.from("email_unsubscribes").delete().eq("email", email);
    } else {
        await db
            .from("email_unsubscribes")
            .upsert({ email, source: "broadcast" }, { onConflict: "email" });
    }
    return NextResponse.json({ ok: true, action });
}
