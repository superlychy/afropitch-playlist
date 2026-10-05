
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';

const DISCORD_WEBHOOK = process.env.ADMIN_WEBHOOK_URL;
// Use non-null assertion or fallback for build safety, though these should exist in runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(process.env.RESEND_API_KEY);

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
            // The webhook payload carries metadata only. Fetch the full body
            // via the Receiving API so the admin inbox shows complete emails.
            const dedupeKey = emailData.message_id || emailData.email_id || null;

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

            // Fetch the full email body and store it for the admin inbox.
            // Runs independently: if this fails, the metadata log + Discord
            // alert above still went through.
            try {
                if (emailData.email_id && process.env.RESEND_API_KEY) {
                    // Idempotency: skip if Resend retries and we already stored it.
                    let alreadyStored = false;
                    if (dedupeKey) {
                        const { data: existing } = await supabase
                            .from('inbound_emails')
                            .select('id')
                            .eq('message_id', dedupeKey)
                            .limit(1);
                        alreadyStored = !!existing && existing.length > 0;
                    }
                    if (!alreadyStored) {
                        const { data: full, error: fetchError } = await resend.emails.receiving.get(emailData.email_id);
                        if (fetchError) {
                            console.error('Failed to fetch inbound email body:', fetchError);
                        } else if (full) {
                            const f: any = full;
                            const toAddr = Array.isArray(f.to) ? (f.to[0] || 'unknown') : (f.to || 'unknown');
                            const { error: insertError } = await supabase.from('inbound_emails').insert({
                                from_email: typeof f.from === 'string' ? f.from : 'unknown',
                                to_email: toAddr,
                                subject: f.subject || '',
                                body_text: (f.text || '').substring(0, 5000),
                                body_html: (f.html || '').substring(0, 5000),
                                message_id: dedupeKey,
                            });
                            if (insertError) console.error('Failed to store inbound email:', insertError);
                            else console.log('📥 Stored inbound email:', { from: f.from, subject: f.subject });
                        }
                    }
                }
            } catch (bodyError) {
                console.error('Inbound body store failed:', bodyError);
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
