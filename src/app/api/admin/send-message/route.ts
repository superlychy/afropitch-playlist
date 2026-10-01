import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { brandedEmail } from '@/lib/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = 'contact@afropitchplay.best';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    try {
        const { to, subject, message, userName } = await request.json();

        if (!to || !subject || !message) {
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

        // Log attempt
        const { data: logEntry, error: logError } = await supabase.from('system_logs').insert({
            event_type: 'admin_message_sent',
            event_data: {
                to: to,
                subject: subject,
                message_preview: message.substring(0, 100),
                status: 'pending'
            }
        }).select().single();

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: `AfroPitch Admin <${SENDER_EMAIL}>`,
            to: [to],
            subject: subject,
            html: brandedEmail(`
                <p style="color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">Message from Admin</p>
                <p style="color: #333; font-size: 16px; margin: 0 0 10px 0;">Hi ${userName || 'there'},</p>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
                    <p style="color: #333; white-space: pre-wrap; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
                </div>
                <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
                    You can reply to this message by logging into your dashboard or replying directly to this email.
                </p>
            `),
            replyTo: 'support@afropitchplay.best'
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
        console.error('Admin message error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
