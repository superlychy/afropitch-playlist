import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FROM = 'AfroPitch <notifications@afropitchplay.best>';

const CATEGORIES: Record<string, { headline: string; subject: string; line: string }> = {
    'artist-of-the-week': {
        headline: 'Artist of the Week',
        subject: 'Your AfroPitch Artist of the Week questionnaire',
        line: 'You have been selected to be the AfroPitch <strong>Artist of the Week</strong>.',
    },
    'rising-artist': {
        headline: 'Rising Artist',
        subject: 'Your AfroPitch Rising Artist questionnaire',
        line: 'You have been selected to be the AfroPitch <strong>Rising Artist</strong>.',
    },
    'artist-of-the-season': {
        headline: 'Artist of the Season',
        subject: 'Your AfroPitch Artist of the Season questionnaire',
        line: 'You have been selected to be the AfroPitch <strong>Artist of the Season</strong>.',
    },
};

function brandedEmail(bodyHtml: string): string {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">AfroPitch Play</h1>
            </div>
            <div style="padding: 30px 20px; background: white; color: #333; font-size: 16px; line-height: 1.6;">
                ${bodyHtml}
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    &copy; 2026 AfroPitch Play. All rights reserved.
                </p>
            </div>
        </div>
    `;
}

export async function POST(request: Request) {
    try {
        const { submission_id, category } = await request.json();

        if (!submission_id || !category || !CATEGORIES[category]) {
            return NextResponse.json({ error: 'submission_id and a valid category are required' }, { status: 400 });
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

        // Load the submission with its artist
        const { data: submission, error: subError } = await supabase
            .from('submissions')
            .select('id, song_title, artist_id, artist:profiles!artist_id(full_name, email)')
            .eq('id', submission_id)
            .single();

        if (subError || !submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const artist = Array.isArray(submission.artist) ? submission.artist[0] : submission.artist;
        const artistName = artist?.full_name?.trim() || 'there';
        const artistEmail = artist?.email?.trim();
        if (!artistEmail) {
            return NextResponse.json({ error: 'Artist has no email on file' }, { status: 400 });
        }

        const cat = CATEGORIES[category];

        // Reuse an existing draft for this submission when there is one, otherwise create it.
        let qToken: string | null = null;
        let featuredId: string | null = null;
        const { data: existing } = await supabase
            .from('featured_artists')
            .select('id, questionnaire_token')
            .eq('submission_id', submission_id)
            .eq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing?.questionnaire_token) {
            qToken = existing.questionnaire_token;
            featuredId = existing.id;
        } else {
            qToken = randomUUID();
            const today = new Date().toISOString().slice(0, 10);
            const { data: created, error: createError } = await supabase
                .from('featured_artists')
                .insert({
                    artist_id: submission.artist_id,
                    submission_id: submission_id,
                    week_start: today,
                    headline: cat.headline,
                    status: 'draft',
                    questionnaire_token: qToken,
                })
                .select('id')
                .single();
            if (createError || !created) {
                return NextResponse.json({ error: 'Could not create featured draft: ' + (createError?.message ?? 'unknown error') }, { status: 500 });
            }
            featuredId = created.id;
        }

        const questionnaireLink = `https://afropitchplay.best/featured/questionnaire/${qToken}`;

        const bodyHtml = `
            <p>Hi ${artistName},</p>
            <p>${cat.line}</p>
            <p>Please fill in the questionnaire so we can publish your feature: your bio, three short questions, and a photo (optional).</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${questionnaireLink}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete the questionnaire</a>
            </p>
            <p>Your feature will be found on Google and AI search, helping new fans discover you.</p>
            <p>Thank you,<br>AfroPitch</p>
        `;

        const { data: sent, error: sendError } = await resend.emails.send({
            from: FROM,
            to: [artistEmail],
            subject: cat.subject,
            html: brandedEmail(bodyHtml),
            text:
                `Hi ${artistName},\n\nYou have been selected to be the AfroPitch ${cat.headline}.\n\n` +
                `Please fill in the questionnaire so we can publish your feature: your bio, three short questions, and a photo (optional).\n\n` +
                `Complete the questionnaire: ${questionnaireLink}\n\n` +
                `Your feature will be found on Google and AI search, helping new fans discover you.\n\nThank you,\nAfroPitch`,
        });

        if (sendError) {
            return NextResponse.json({ error: 'Email failed to send: ' + sendError.message }, { status: 502 });
        }

        await supabase.from('system_logs').insert({
            event_type: 'admin_featured_email_sent',
            event_data: {
                to: artistEmail,
                category,
                submission_id,
                featured_id: featuredId,
                resend_id: sent?.id ?? null,
                sent_by: user.email,
            },
        });

        return NextResponse.json({ ok: true, featured_id: featuredId, email_id: sent?.id ?? null });
    } catch (err: any) {
        console.error('send-featured-email error:', err);
        return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 });
    }
}
