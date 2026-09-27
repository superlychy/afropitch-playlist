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

    // 2. Fetch the Secret from Database Vault via RPC
    const { data: webhookUrl, error: secretError } = await supabase.rpc('get_discord_webhook');

    if (secretError || !webhookUrl) {
        console.error("Failed to retrieve secret from DB Vault:", secretError);
        return new Response("Configuration Error: Missing Secret in Vault", { status: 500 });
    }

    const DISCORD_WEBHOOK_URL = webhookUrl as string;

    try {
        const payload = JSON.parse(rawBody);
        const type = payload.type;
        const data = payload.data || {};

        let title = "Using Resend Webhook";
        let color = 3447003; // Default Blue
        let description = "";
        const fields = [];

        // Handle Resend Events
        if (type === 'email.delivered' || type === 'email.sent' || type === 'email.opened' || type === 'email.clicked' || type === 'email.bounced' || type === 'email.complained') {
            title = `Update: ${type.toUpperCase()}`;
            if (type === 'email.delivered' || type === 'email.sent') color = 5763719; // Green
            if (type === 'email.bounced' || type === 'email.complained') color = 15548997; // Red

            fields.push({ name: "To", value: Array.isArray(data.to) ? data.to.join(", ") : (data.to || 'Unknown'), inline: true });
            fields.push({ name: "Subject", value: data.subject || "No Subject", inline: true });
            description = `Email ID: ${data.email_id || 'N/A'}`;
        }
        // Handle Inbound
        else if (payload.from && payload.subject) {
            title = "New Email Received 📬";
            color = 5763719;

            // Log to database for Muse's inbound-email watcher
            const { error: logError } = await supabase.from('inbound_emails').insert({
                from_email: typeof payload.from === 'string' ? payload.from : JSON.stringify(payload.from),
                to_email: Array.isArray(payload.to) ? (payload.to[0] || 'unknown') : (payload.to || 'unknown'),
                subject: payload.subject || '',
                body_text: (payload.text || '').substring(0, 5000),
                body_html: (payload.html || '').substring(0, 5000),
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

        // Construct Discord Payload
        const discordBody = {
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
        };

        // Send to Discord
        const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordBody)
        });

        if (!discordRes.ok) {
            const errText = await discordRes.text();
            console.error("Discord Error:", errText);
            return new Response(`Discord Error: ${errText}`, { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
