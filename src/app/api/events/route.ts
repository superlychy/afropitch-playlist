
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

const DISCORD_WEBHOOK = process.env.ADMIN_WEBHOOK_URL;
// Use non-null assertion or fallback for build safety, though these should exist in runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verify a Resend (Svix) webhook signature. Fail closed.
 */
function verifyResendSignature(
    rawBody: string,
    headers: Headers,
    secret: string
): boolean {
    try {
        const svixId = headers.get("svix-id");
        const svixTimestamp = headers.get("svix-timestamp");
        const svixSignature = headers.get("svix-signature");
        if (!svixId || !svixTimestamp || !svixSignature) return false;

        const ts = parseInt(svixTimestamp, 10);
        if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

        const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
        const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
        const expected = createHmac("sha256", key).update(signedContent).digest("base64");

        return svixSignature.split(" ").some((sig) => {
            const parts = sig.split(",");
            if (parts.length !== 2 || parts[0] !== "v1") return false;
            const a = Buffer.from(parts[1]);
            const b = Buffer.from(expected);
            return a.length === b.length && timingSafeEqual(a, b);
        });
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    try {
        // Verify this really came from Resend (Svix signature). Fail closed.
        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET_EVENTS;
        const rawBody = await request.text();
        if (
            !webhookSecret ||
            !verifyResendSignature(rawBody, request.headers, webhookSecret)
        ) {
            console.warn("[Events] Rejected unverified webhook");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);

        // Handle Inbound Email Events from Resend
        if (payload.type === 'email.received') {
            const emailData = payload.data;
            const from = emailData.from;
            const subject = emailData.subject;
            const to = emailData.to.join(', ');
            // Resend doesn't send body in webhook, only metadata. 
            // We'd have to use their API to fetch content if needed, but for now metadata is good notification.

            console.log('📨 Received Email via Webhook:', { from, subject, to });

            // Log to database for real-time dashboard visibility
            try {
                await supabase.from('system_logs').insert({
                    event_type: 'email_received',
                    event_data: payload.data,
                    user_id: null // System event
                });
            } catch (dbError) {
                console.error('Failed to log to Supabase:', dbError);
            }

            // Notify via Discord
            if (DISCORD_WEBHOOK) {
                await fetch(DISCORD_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `📧 **Incoming Email Received**\n**From:** ${from}\n**To:** ${to}\n**Subject:** ${subject}\n\n*Check Admin Dashboard for log.*`,
                        username: 'AfroPitch Mail Bot'
                    })
                });
            }

            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ received: true }); // Acknowledge all events
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
