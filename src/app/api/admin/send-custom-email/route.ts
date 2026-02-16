import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    try {
        const { to, from, subject, message } = await request.json();

        if (!to || !from || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify admin session and role
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        // Validate "from" address is on allowed domain
        const allowedDomain = 'afropitchplay.best';
        const fromDomain = from.split('@')[1];
        if (fromDomain !== allowedDomain) {
            return NextResponse.json({
                error: `From address must be on ${allowedDomain} domain`
            }, { status: 400 });
        }

        // Log attempt
        const { data: logEntry } = await supabase.from('system_logs').insert({
            event_type: 'admin_custom_email_sent',
            event_data: {
                to: to,
                from: from,
                subject: subject,
                message_preview: message.substring(0, 100),
                status: 'pending',
                sent_by: user.email
            }
        }).select().single();

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: `AfroPitch <${from}>`,
            to: [to],
            subject: subject,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0;">AfroPitch Play</h1>
                    </div>
                    <div style="padding: 30px 20px; background: white;">
                        <div style="white-space: pre-wrap; color: #333;">${message.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            © 2026 AfroPitch Play. All rights reserved.
                        </p>
                    </div>
                </div>
            `,
            replyTo: from
        });

        if (error) {
            console.error('Resend API Error:', error);
            // Update log to failed
            if (logEntry) {
                await supabase.from('system_logs').update({
                    event_data: { ...logEntry.event_data, status: 'failed', error: error.message }
                }).eq('id', logEntry.id);
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update log to success
        if (logEntry) {
            await supabase.from('system_logs').update({
                event_data: { ...logEntry.event_data, status: 'sent', resend_id: data?.id }
            }).eq('id', logEntry.id);
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Custom email error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
