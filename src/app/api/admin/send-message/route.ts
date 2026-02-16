import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

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

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: `AfroPitch Admin <${SENDER_EMAIL}>`,
            to: [to],
            subject: subject,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0;">AfroPitch Play</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Message from Admin</p>
                    </div>
                    <div style="padding: 30px 20px; background: white;">
                        <p style="color: #333; font-size: 16px; margin: 0 0 10px 0;">Hi ${userName || 'there'},</p>
                        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
                            <p style="color: #333; white-space: pre-wrap; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
                            You can reply to this message by logging into your dashboard or replying directly to this email.
                        </p>
                    </div>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            © 2026 AfroPitch Play. All rights reserved.
                        </p>
                    </div>
                </div>
            `,
            replyTo: 'support@afropitchplay.best'
        });

        if (error) {
            console.error('Resend API Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log the message
        await supabase.from('system_logs').insert({
            event_type: 'admin_message_sent',
            event_data: {
                to: to,
                subject: subject,
                message_preview: message.substring(0, 100)
            }
        });

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Admin message error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
