
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DISCORD_WEBHOOK = process.env.ADMIN_WEBHOOK_URL;
// Use non-null assertion or fallback for build safety, though these should exist in runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    try {
        const payload = await request.json();

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
