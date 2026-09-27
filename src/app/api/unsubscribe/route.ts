import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

function admin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
    // Read the body once: one-click unsubscribe (Gmail etc.) POSTs to the
    // List-Unsubscribe URL with the token in the query string and no body;
    // the web form sends JSON.
    let bodyToken: string | null = null;
    let action = "unsubscribe";
    try {
        const body = await req.json();
        if (typeof body?.token === "string") bodyToken = body.token;
        if (body?.action === "resubscribe") action = "resubscribe";
    } catch {
        /* no body */
    }
    const token = req.nextUrl.searchParams.get("token") ?? bodyToken;
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });
    const email = await verifyUnsubscribeToken(token);
    if (!email) return NextResponse.json({ ok: false }, { status: 400 });

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
