import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSign } from "crypto";

/**
 * POST /api/push/fanout
 * Called by the `notify_push_on_notification` DB trigger on every new row in
 * `notifications`. Looks up the user's registered app tokens and delivers the
 * notification via Firebase Cloud Messaging (HTTP v1 API).
 *
 * Auth: shared secret in the `x-push-secret` header (PUSH_FANOUT_SECRET env).
 * Body: { notification_id: string }
 *
 * Until FIREBASE_SERVICE_ACCOUNT + PUSH_FANOUT_SECRET are configured, this
 * returns 503 and push stays dormant. Nothing else breaks.
 */

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

function base64url(input: Buffer | string): string {
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFcmAccessToken(serviceAccount: {
    client_email: string;
    private_key: string;
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64url(
        JSON.stringify({
            iss: serviceAccount.client_email,
            scope: FCM_SCOPE,
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        })
    );
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    const signature = base64url(signer.sign(serviceAccount.private_key));
    const assertion = `${header}.${payload}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
        }),
    });
    if (!res.ok) {
        throw new Error(`OAuth token exchange failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error("No access token in OAuth response");
    return data.access_token as string;
}

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 500);
}

export async function POST(request: Request) {
    const secret = process.env.PUSH_FANOUT_SECRET;
    if (!secret || request.headers.get("x-push-secret") !== secret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saRaw) {
        // Firebase not wired up yet; tokens may already be collecting.
        return NextResponse.json({ ok: false, reason: "push-not-configured" }, { status: 503 });
    }
    let serviceAccount: { client_email: string; private_key: string; project_id: string };
    try {
        serviceAccount = JSON.parse(saRaw);
    } catch {
        return NextResponse.json({ error: "Bad service account config" }, { status: 500 });
    }

    let body: { notification_id?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.notification_id) {
        return NextResponse.json({ error: "notification_id required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: notification } = await admin
        .from("notifications")
        .select("id, user_id, title, message")
        .eq("id", body.notification_id)
        .single();
    if (!notification) return NextResponse.json({ ok: true, sent: 0 });

    const { data: tokens } = await admin
        .from("push_tokens")
        .select("token")
        .eq("user_id", notification.user_id);
    if (!tokens || tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    let accessToken: string;
    try {
        accessToken = await getFcmAccessToken(serviceAccount);
    } catch (e) {
        console.error("[push/fanout] FCM auth failed:", e);
        return NextResponse.json({ error: "FCM auth failed" }, { status: 502 });
    }

    const title = notification.title || "AfroPitch";
    const bodyText = stripHtml(notification.message || "");
    const sendUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    let sent = 0;
    const invalid: string[] = [];
    for (const { token } of tokens) {
        try {
            const res = await fetch(sendUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: {
                        token,
                        notification: { title, body: bodyText },
                        data: {
                            title,
                            url: "https://afropitchplay.best/dashboard",
                            notification_id: notification.id,
                        },
                        android: { priority: "high" },
                    },
                }),
            });
            if (res.ok) {
                sent++;
            } else {
                const err = await res.json().catch(() => ({}));
                const code = err?.error?.details?.[0]?.errorCode
                    || err?.error?.status
                    || "";
                if (code === "UNREGISTERED" || res.status === 404 || res.status === 400) {
                    invalid.push(token);
                } else {
                    console.error("[push/fanout] FCM send failed:", res.status, JSON.stringify(err).slice(0, 300));
                }
            }
        } catch (e) {
            console.error("[push/fanout] FCM request error:", e);
        }
    }

    // Prune dead tokens so we don't keep paying for doomed sends.
    if (invalid.length > 0) {
        await admin.from("push_tokens").delete().in("token", invalid);
    }

    return NextResponse.json({ ok: true, sent, pruned: invalid.length });
}
