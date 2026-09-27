import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Receives user-side JS error reports from <ErrorReporter />.
// Dedupes: same message + page within 2h bumps a counter instead of new row.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { kind, message, stack, url, userAgent, userId } = body || {};
        if (!message || typeof message !== "string") {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
            .from("client_errors")
            .select("id, error_count")
            .eq("message", message.slice(0, 500))
            .eq("url", (url || "").slice(0, 500))
            .gte("last_seen", since)
            .order("last_seen", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing) {
            await supabase
                .from("client_errors")
                .update({
                    error_count: (existing.error_count || 1) + 1,
                    last_seen: new Date().toISOString(),
                    notified: false,
                })
                .eq("id", existing.id);
        } else {
            await supabase.from("client_errors").insert({
                kind: kind || "error",
                message: message.slice(0, 500),
                stack: (stack || "").slice(0, 2000),
                url: (url || "").slice(0, 500),
                user_agent: (userAgent || "").slice(0, 300),
                user_id: userId || null,
            });
        }
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
