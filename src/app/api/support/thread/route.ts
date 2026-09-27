import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET: full message thread for one ticket (admin only).
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) {
        return NextResponse.json({ ok: false, error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');
    if (!ticketId) {
        return NextResponse.json({ ok: false, error: 'ticket_id is required.' }, { status: 400 });
    }

    const { data: messages, error } = await supabase
        .from('support_messages')
        .select('id, message, sender_id, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ ok: false, error: 'Could not load thread.' }, { status: 500 });
    }

    // Label each message: admin reply vs visitor message.
    const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id).filter(Boolean))];
    let adminIds = new Set<string>();
    if (senderIds.length > 0) {
        const { data: profs } = await supabase
            .from('profiles')
            .select('id')
            .in('id', senderIds)
            .eq('role', 'admin');
        adminIds = new Set((profs || []).map((p: any) => p.id));
    }

    return NextResponse.json({
        ok: true,
        messages: (messages || []).map((m: any) => ({
            id: m.id,
            message: m.message,
            created_at: m.created_at,
            from_admin: !!m.sender_id && adminIds.has(m.sender_id),
        })),
    });
}
