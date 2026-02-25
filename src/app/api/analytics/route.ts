import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDiscordNotification } from '@/lib/discord';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, sessionId, href, referrer, userAgent, userId } = body;

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'Unknown IP';
        const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

        if (type === 'init') {
            const { data: existing } = await supabase
                .from('analytics_visits')
                .select('id, clicks, page_views')
                .eq('session_id', sessionId)
                .single();

            if (existing) {
                // Update page views, last_seen, path, and attach user_id if now logged in
                const updatePayload: any = {
                    page_views: (existing.page_views || 1) + 1,
                    last_seen_at: new Date().toISOString(),
                    path: href,
                };
                if (userId) updatePayload.user_id = userId;

                await supabase
                    .from('analytics_visits')
                    .update(updatePayload)
                    .eq('session_id', sessionId);
            } else {
                // New session — check if we should notify Discord
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data: recentSessions } = await supabase
                    .from('analytics_visits')
                    .select('id')
                    .eq('ip_address', ip)
                    .gt('created_at', oneHourAgo)
                    .limit(1);

                const shouldNotify = !recentSessions || recentSessions.length === 0;

                await supabase.from('analytics_visits').insert({
                    session_id: sessionId,
                    ip_address: ip,
                    user_agent: userAgent,
                    country,
                    path: href,
                    created_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString(),
                    page_views: 1,
                    clicks: 0,
                    duration_seconds: 0,
                    user_id: userId || null,
                });

                if (shouldNotify) {
                    const msg = `**New Visitor!** 🌍\n**IP:** ${ip} (${country})\n**Path:** ${href}${userId ? `\n**User:** logged in` : ''}`;
                    sendDiscordNotification(msg).catch(() => { });
                }
            }
        }
        else if (type === 'heartbeat') {
            const { duration = 10, clickCount = 0 } = body;

            await supabase.rpc('increment_analytics_duration', {
                p_session_id: sessionId,
                p_seconds: duration
            });

            if (clickCount > 0) {
                await supabase.rpc('increment_analytics_clicks_count', {
                    p_session_id: sessionId,
                    p_count: clickCount
                });
            }

            // Patch user_id onto the session if they just logged in
            if (userId) {
                await supabase
                    .from('analytics_visits')
                    .update({ user_id: userId })
                    .eq('session_id', sessionId)
                    .is('user_id', null);
            }
        }
        else if (type === 'login') {
            const { email, role } = body;
            const msg = `**User Login** 🔐\n**Email:** ${email}\n**Role:** ${role || 'Unknown'}\n**IP:** ${ip} (${country})`;
            sendDiscordNotification(msg).catch(() => { });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
