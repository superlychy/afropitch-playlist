import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

/** Verify a Resend (Svix) webhook signature. Fail closed. */
async function verifySvixSignature(req: Request, rawBody: string, secret: string | undefined): Promise<boolean> {
    try {
        if (!secret) return false;
        const svixId = req.headers.get("svix-id");
        const svixTimestamp = req.headers.get("svix-timestamp");
        const svixSignature = req.headers.get("svix-signature");
        if (!svixId || !svixTimestamp || !svixSignature) return false;

        const ts = parseInt(svixTimestamp, 10);
        if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

        const keyBytes = b64ToBytes(secret.replace(/^whsec_/, ""));
        const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signed = new TextEncoder().encode(`${svixId}.${svixTimestamp}.${rawBody}`);
        const sigBuf = await crypto.subtle.sign("HMAC", key, signed);
        const sigBytes = new Uint8Array(sigBuf);
        let bin = "";
        for (const b of sigBytes) bin += String.fromCharCode(b);
        const expected = btoa(bin);

        return svixSignature.split(" ").some((entry) => {
            const parts = entry.split(",");
            if (parts.length !== 2 || parts[0] !== "v1" || parts[1].length !== expected.length) return false;
            // timing-safe compare
            let diff = 0;
            for (let i = 0; i < expected.length; i++) diff |= parts[1].charCodeAt(i) ^ expected.charCodeAt(i);
            return diff === 0;
        });
    } catch {
        return false;
    }
}

serve(async (req) => {
    // Basic Request Handling
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // Verify this really came from Resend (Svix signature). Fail closed.
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!(await verifySvixSignature(req, rawBody, webhookSecret))) {
        console.warn("Rejected unverified resend-webhook call");
        return new Response("Invalid signature", { status: 401 });
    }

    // 1. Initialize Supabase Client (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let title = "Using Resend Webhook";
    let color = 3447003; // Default Blue
    let description = "";
    const fields: { name: string; value: string; inline: boolean }[] = [];

    try {
        const payload = JSON.parse(rawBody);
        const type = payload.type;
        const data = payload.data || {};

        // Handle Resend Events
        if (type === 'email.delivered' || type === 'email.sent' || type === 'email.opened' || type === 'email.clicked' || type === 'email.bounced' || type === 'email.complained') {
            title = `Update: ${type.toUpperCase()}`;
            if (type === 'email.delivered' || type === 'email.sent') color = 5763719; // Green
            if (type === 'email.bounced' || type === 'email.complained') color = 15548997; // Red

            fields.push({ name: "To", value: Array.isArray(data.to) ? data.to.join(", ") : (data.to || 'Unknown'), inline: true });
            fields.push({ name: "Subject", value: data.subject || "No Subject", inline: true });
            description = `Email ID: ${data.email_id || 'N/A'}`;

            // Persist delivery events so a Discord outage never loses them.
            const { error: logError } = await supabase.from('system_logs').insert({
                event_type: 'resend_event',
                event_data: { type, to: data.to ?? null, subject: data.subject ?? null, email_id: data.email_id ?? null },
                user_id: null,
            });
            if (logError) console.error('Failed to log resend event:', logError);
        }
        // Handle Inbound — new Resend event format: { type: 'email.received', data: { from, to, subject, text, html } }
        else if (type === 'email.received' && data && (data.from || data.subject)) {
            title = "New Email Received";
            color = 5763719;

            const fromAddr = typeof data.from === 'string' ? data.from : JSON.stringify(data.from ?? 'unknown');
            const toAddr = Array.isArray(data.to) ? (data.to[0] || 'unknown') : (data.to || 'unknown');

            // Log to database for the admin inbox and the inbound-email watcher.
            // This is the primary record; it must not depend on Discord.
            const { error: logError } = await supabase.from('inbound_emails').insert({
                from_email: fromAddr,
                to_email: toAddr,
                subject: data.subject || '',
                body_text: (data.text || ''),
                body_html: (data.html || ''),
            });
            if (logError) console.error('Failed to log inbound email:', logError);

            fields.push({ name: "From", value: fromAddr, inline: true });
            fields.push({ name: "Subject", value: data.subject || "No subject", inline: false });

            let bodySnippet = data.text || data.html || "No Content";
            if (bodySnippet.length > 200) bodySnippet = bodySnippet.substring(0, 200) + "...";
            description = bodySnippet;
        }
        // Handle Inbound — legacy direct-payload format: { from, to, subject, text, html }
        else if (payload.from && payload.subject) {
            title = "New Email Received";
            color = 5763719;

            // Log to database for Muse's inbound-email watcher
            const { error: logError } = await supabase.from('inbound_emails').insert({
                from_email: typeof payload.from === 'string' ? payload.from : JSON.stringify(payload.from),
                to_email: Array.isArray(payload.to) ? (payload.to[0] || 'unknown') : (payload.to || 'unknown'),
                subject: payload.subject || '',
                body_text: (payload.text || ''),
                body_html: (payload.html || ''),
            });
            if (logError) console.error('Failed to log inbound email:', logError);

            fields.push({ name: "From", value: payload.from, inline: true });
            fields.push({ name: "Subject", value: payload.subject, inline: false });

            let bodySnippet = payload.text || payload.html || "No Content";
            if (bodySnippet.length > 200) bodySnippet = bodySnippet.substring(0, 200) + "...";
            description = bodySnippet;
        } else {
            title = "Unknown Resend Event";
            description = `Start of payload: ${JSON.stringify(payload).substring(0, 500)}`;
        }
    } catch (e: unknown) {
        console.error("Webhook Error:", e);
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
    }

    // Discord notification is best-effort: it must NEVER fail the webhook.
    // A dead Discord webhook previously returned 500 for every event, which
    // got this endpoint auto-disabled by Resend. Database writes above are
    // the primary record; Discord is only a courtesy ping.
    try {
        const { data: webhookUrl } = await supabase.rpc('get_discord_webhook');
        if (webhookUrl) {
            const discordRes = await fetch(webhookUrl as string, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: title,
                            description: description,
                            color: color,
                            fields: fields,
                            timestamp: new Date().toISOString(),
                            footer: { text: "AfroPitch Notifier • Powered by Resend" }
                        }
                    ]
                })
            });
            if (!discordRes.ok) {
                console.error("Discord notify failed (non-fatal):", await discordRes.text());
            }
        } else {
            console.warn("Discord notify skipped (non-fatal): no webhook URL in vault");
        }
    } catch (e) {
        console.error("Discord notify failed (non-fatal):", e);
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
});
