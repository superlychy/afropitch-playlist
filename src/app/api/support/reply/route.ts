import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { brandedEmail } from '@/lib/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = 'contact@afropitchplay.best';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function requireAdmin(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return null;
    return user;
}

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);
        if (!admin) {
            return NextResponse.json({ ok: false, error: 'Forbidden: Admins only' }, { status: 403 });
        }

        const body = await request.json();
        const ticketId = body?.ticket_id;
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        if (!ticketId || !message) {
            return NextResponse.json(
                { ok: false, error: 'Ticket and message are required.' },
                { status: 400 }
            );
        }
        if (message.length > 5000) {
            return NextResponse.json(
                { ok: false, error: 'Message is too long (max 5000 characters).' },
                { status: 400 }
            );
        }

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('id, subject, contact_email, user_id')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json(
                { ok: false, error: 'Ticket not found.' },
                { status: 404 }
            );
        }

        const { error: msgError } = await supabase.from('support_messages').insert({
            ticket_id: ticket.id,
            sender_id: admin.id,
            message,
        });

        if (msgError) {
            await supabase.from('system_logs').insert({
                event_type: 'support_reply_failed',
                event_data: { ticket_id: ticket.id, error: msgError.message },
            });
            return NextResponse.json(
                { ok: false, error: 'Could not save reply.' },
                { status: 500 }
            );
        }

        // Email the reply to the visitor (this is the promised reply channel).
        let toEmail: string | null = ticket.contact_email || null;
        if (!toEmail && ticket.user_id) {
            const { data: u } = await supabase.auth.admin.getUserById(ticket.user_id);
            toEmail = u?.user?.email || null;
        }

        if (toEmail) {
            const html = brandedEmail(`
                    <h2 style="margin-top: 0; margin-bottom: 4px;">AfroPitch Support replied</h2>
                    <p style="color: #555; font-size: 14px;">Re: ${esc(ticket.subject || 'your support ticket')}</p>
                    <div style="background: #f5f5f5; border-left: 4px solid #16a34a; padding: 14px 16px; margin: 16px 0; white-space: pre-wrap;">${esc(message)}</div>
                    <p style="color: #555; font-size: 14px;">Need anything else? Just reply to this email and our team will pick it up.</p>
                    <p style="color: #999; font-size: 12px;">- The AfroPitch Team</p>
            `);
            try {
                await resend.emails.send({
                    from: `AfroPitch Support <${SENDER_EMAIL}>`,
                    to: toEmail,
                    subject: `Re: ${ticket.subject || 'your support ticket'}`,
                    html,
                });
            } catch (e: any) {
                await supabase.from('system_logs').insert({
                    event_type: 'support_reply_email_failed',
                    event_data: { ticket_id: ticket.id, error: e?.message || String(e) },
                });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || 'Failed to send reply.' },
            { status: 500 }
        );
    }
}
