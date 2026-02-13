import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDiscordNotification } from '@/lib/discord';

// Initialize Service Role Client for Analytics Writes
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, sessionId, href, referrer, userAgent } = body;

        // Get IP (Approximate)
        const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
        // Simple country lookup using Vercel headers if available, else 'Unknown'
        const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

        if (type === 'init') {
            // Check if session exists (debounce reloads)
            const { data: existing } = await supabase
                .from('analytics_visits')
                .select('id, clicks, page_views')
                .eq('session_id', sessionId)
                .single();

            if (existing) {
                // Determine if this is a "new page view" (navigation) or just a reload
                // We update last_seen and increment page_views
                await supabase
                    .from('analytics_visits')
                    .update({
                        page_views: (existing.page_views || 1) + 1,
                        last_seen_at: new Date().toISOString()
                    })
                    .eq('session_id', sessionId);
            } else {
                // New Session Created!

                // CHECK VISITOR FREQUENCY FOR NOTIFICATION
                // Check if this IP has had a session in the last 1 HOUR
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
                    country: country,
                    path: href,
                    created_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString(),
                    page_views: 1,
                    clicks: 0,
                    duration_seconds: 0
                });

                // ONLY Notify if no recent sessions from this IP
                if (shouldNotify) {
                    const msg = `**New Visitor!** 🌍\n**IP:** ${ip} (${country})\n**Path:** ${href}`;
                    sendDiscordNotification(msg).catch(err => console.error("Discord Error", err));
                }
            }
        }
        else if (type === 'heartbeat') {
            const { duration = 5, clickCount = 0 } = body;

            // Increment Duration
            await supabase.rpc('increment_analytics_duration', {
                p_session_id: sessionId,
                p_seconds: duration
            });

            // Handle Batched Clicks
            if (clickCount > 0) {
                await supabase.rpc('increment_analytics_clicks_count', {
                    p_session_id: sessionId,
                    p_count: clickCount
                });
            }
        }
        else if (type === 'click') {
            await supabase.rpc('increment_analytics_clicks', {
                p_session_id: sessionId
            });
        }
        else if (type === 'login') {
            const { email, role } = body;
            const msg = `**User Login** 🔐\n**Email:** ${email}\n**Role:** ${role || 'Unknown'}\n**IP:** ${ip} (${country})`;
            sendDiscordNotification(msg).catch(err => console.error("Discord Error", err));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
