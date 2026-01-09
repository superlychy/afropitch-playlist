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
                await supabase
                    .from('analytics_visits')
                    .update({
                        page_views: existing.page_views + 1,
                        last_seen_at: new Date().toISOString()
                    })
                    .eq('session_id', sessionId);
            } else {
                // New Visitor!
                await supabase.from('analytics_visits').insert({
                    session_id: sessionId,
                    ip_address: ip,
                    user_agent: userAgent,
                    country: country,
                    path: href,
                    created_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString(),
                    page_views: 1,
                    clicks: 0
                });

                // Send Discord Notification
                const msg = `**New Visitor!** 🌍\n**IP:** ${ip} (${country})\n**Path:** ${href}\n**UA:** ${userAgent}`;
                // Fire and forget (don't await to block response)
                sendDiscordNotification(msg).catch(err => console.error("Discord Error", err));
            }
        }
        else if (type === 'heartbeat') {
            await supabase
                .from('analytics_visits')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('session_id', sessionId);
        }
        else if (type === 'click') {
            // Increment click count safely
            // Note: Postgres doesn't have a simple 'increment' in `update` via JS SDK easily without RPC
            // So we fetch first or use a raw query. For stats, RPC is better, or simple read-write.
            // Let's use RPC if possible, or just read-write for simplicity (concurrency not huge issue here).

            const { data: current } = await supabase
                .from('analytics_visits')
                .select('clicks')
                .eq('session_id', sessionId)
                .single();

            if (current) {
                await supabase
                    .from('analytics_visits')
                    .update({
                        clicks: current.clicks + 1,
                        last_seen_at: new Date().toISOString() // also update heartbeat
                    })
                    .eq('session_id', sessionId);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
