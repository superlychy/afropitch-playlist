import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/push/register
 * Registers (or refreshes) the device's FCM token for push notifications.
 * Authenticated: the token is always tied to the caller's user id.
 * Body: { token: string, platform?: string, app_version?: string }
 */
export async function POST(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : null;
    if (!token) {
        return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    let body: { token?: string; platform?: string; app_version?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const deviceToken = (body.token || "").trim();
    if (!deviceToken || deviceToken.length < 32) {
        return NextResponse.json({ error: "A valid FCM token is required" }, { status: 400 });
    }

    const { error: upsertError } = await supabase.from("push_tokens").upsert(
        {
            user_id: user.id,
            token: deviceToken,
            platform: (body.platform || "android").slice(0, 32),
            app_version: (body.app_version || null)?.slice(0, 32) || null,
            last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" }
    );
    if (upsertError) {
        return NextResponse.json({ error: "Could not save token" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push/register
 * Removes a token (e.g. on logout). Body: { token: string }
 */
export async function DELETE(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : null;
    if (!token) {
        return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    let body: { token?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const deviceToken = (body.token || "").trim();
    if (!deviceToken) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await supabase.from("push_tokens").delete().eq("token", deviceToken).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
}
