import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { brandedEmail } from '@/lib/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FROM = 'AfroPitch <notifications@afropitchplay.best>';

/**
 * Publish a featured artist AND notify them by email in one step.
 * The email is the default: every featured artist gets a notification
 * the moment their feature goes live. Re-publishing an already
 * published feature does not resend the email.
 */
export async function POST(request: Request) {
    try {
        const { feature_id } = await request.json();

        if (!feature_id) {
            return NextResponse.json({ error: 'feature_id is required' }, { status: 400 });
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
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        // Load the feature
        const { data: feature, error: featError } = await supabase
            .from('featured_artists')
            .select('id, headline, status, artist_id')
            .eq('id', feature_id)
            .single();
        if (featError || !feature) {
            return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
        }

        // Already published: do not resend the email.
        if (feature.status === 'published') {
            return NextResponse.json({ ok: true, email_sent: false, reason: 'already published' });
        }

        // Publish
        const { error: updateError } = await supabase
            .from('featured_artists')
            .update({ status: 'published' })
            .eq('id', feature_id);
        if (updateError) {
            return NextResponse.json({ error: 'Could not publish feature: ' + updateError.message }, { status: 500 });
        }

        // Notify the artist. Publish already succeeded, so an email failure
        // must not fail the request, it is reported instead.
        let emailSent = false;
        let emailReason: string | null = null;
        const { data: artist } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', feature.artist_id)
            .single();
        const artistEmail = artist?.email?.trim();
        const artistName = artist?.full_name?.trim() || 'there';
        const headline = feature.headline || 'Spotlight';

        if (!artistEmail) {
            emailReason = 'artist has no email on file';
        } else {
            const bodyHtml = `
                <p>Hi ${artistName},</p>
                <p>Your AfroPitch <strong>${headline}</strong> feature is now live. You can see it here: <a href="https://afropitchplay.best/featured">https://afropitchplay.best/featured</a></p>
                <p>Thank you,<br>AfroPitch</p>
            `;
            const { data: sent, error: sendError } = await resend.emails.send({
                from: FROM,
                to: [artistEmail],
                subject: `Your AfroPitch ${headline} feature is live`,
                html: brandedEmail(bodyHtml),
                text:
                    `Hi ${artistName},\n\nYour AfroPitch ${headline} feature is now live. You can see it here: https://afropitchplay.best/featured\n\nThank you,\nAfroPitch`,
            });
            if (sendError) {
                emailReason = 'email failed: ' + sendError.message;
            } else {
                emailSent = true;
                await supabase.from('system_logs').insert({
                    event_type: 'featured_published_email_sent',
                    event_data: {
                        to: artistEmail,
                        headline,
                        featured_id: feature_id,
                        resend_id: sent?.id ?? null,
                        sent_by: user.email,
                    },
                });
            }
        }

        return NextResponse.json({ ok: true, email_sent: emailSent, reason: emailReason });
    } catch (err: any) {
        console.error('publish-featured error:', err);
        return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 });
    }
}
