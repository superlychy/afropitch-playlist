
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'resend';
import { getTransactionReceiptTemplate, getSongApprovedTemplate, getSongDeclinedTemplate, getSupportTicketTemplate, getSupportTicketReceivedTemplate, getSupportTicketAdminTemplate, getCuratorApprovedTemplate, getCuratorRejectedTemplate, getMixingMessageTemplate, getMixingRefundRequestTemplate, getMixingRefundDeniedTemplate } from './templates.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const CURRENCY = '₦';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://afropitchplay.best'; // Default to Production URL

Deno.serve(async (req) => {
    // 1. Verify Request
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const payload = await req.json();
        console.log("🔔 Notification Request for:", payload.table, payload.type);

        const { table, type, record, schema } = payload;

        // Ensure we handle public schema only or specific logic
        if (schema !== 'public') return new Response('Ignored schema', { status: 200 });

        // LOGIC BRANCHING
        /* 
           - transactions (INSERT) -> Receipt (Deposit, Withdraw, Refund, Payment)
           - submissions (UPDATE) -> Approved / Declined
           - withdrawals (UPDATE) -> Approved (Processed)
           - support_tickets (INSERT/UPDATE) -> Acknowledgement
        */

        if (table === 'transactions' && type === 'INSERT') {
            await handleTransaction(record);
        } else if (table === 'submissions') {
            if (type === 'UPDATE') {
                // Only notify if status changed
                if (record.status !== payload.old_record?.status) {
                    await handleSubmissionUpdate(record);
                }
                // Notify if ranking was boosted
                if (record.ranking_boosted_at !== payload.old_record?.ranking_boosted_at && record.ranking_boosted_at) {
                    await handleRankingBoost(record);
                }
            } else if (type === 'INSERT') {
                await handleSubmissionInsert(record);
            }
        } else if (table === 'withdrawals' && type === 'UPDATE') {
            if (record.status !== payload.old_record?.status) {
                await handleWithdrawalUpdate(record);
            }
        } else if (table === 'support_tickets' && type === 'INSERT') {
            await handleSupportInsert(record);
        } else if (table === 'support_tickets' && type === 'UPDATE') {
            // Notify on status change or response? Usually status change is a good proxy or explicit 'has_unread'
            // Simplicity: Notify if status changed to 'open' (reply) or 'closed'
            if (record.status !== payload.old_record?.status) {
                await handleSupportUpdate(record);
            }
        } else if (table === 'curator_applications' && type === 'UPDATE') {
            if (record.status !== payload.old_record?.status) {
                await handleCuratorApplicationUpdate(record);
            }
        } else if (table === 'broadcasts' && type === 'INSERT') {
            await handleBroadcast(record);
        } else if (table === 'mixing_messages' && type === 'INSERT') {
            await handleMixingMessage(record);
        } else if (table === 'mixing_orders' && type === 'UPDATE') {
            await handleMixingRefund(record, payload.old_record);
        }

        return new Response(JSON.stringify({ message: "Notification processed" }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Error processing notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});

// --- Handlers ---

async function getUserEmail(userId: string) {
    // 1. Fetch Email from Auth (Reliable)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
        console.error("Could not find auth user:", userId, userError);
        return null;
    }

    // 2. Fetch Name from Profile (Optional but nice)
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();

    return {
        email: userData.user.email,
        full_name: profile?.full_name || 'AfroPitch User'
    };
}

async function handleTransaction(record: any) {
    // types: 'payment', 'refund', 'earning', 'withdrawal', 'deposit'
    // We notify on: Deposit (Add Funds), Refund (System automated), Payment (Receipt), Withdrawal(Request receipt)
    // Earning: Maybe? Curators get many, might be spammy. Let's stick to user-centric critical money mvmt.

    const user = await getUserEmail(record.user_id);
    if (!user || !user.email) return;

    let subject = `Transaction Receipt: ${CURRENCY}${record.amount}`;
    if (record.type === 'refund') subject = `Refund Processed: ${CURRENCY}${record.amount}`;
    if (record.type === 'deposit') subject = `Funds Added: ${CURRENCY}${record.amount}`;

    // User requested to NOT send email for withdrawal requests until approved.
    // The 'handleWithdrawalUpdate' function handles the 'approved' status notification.
    if (record.type === 'withdrawal') {
        console.log("Skipping email for withdrawal request (pending approval).");
        return;
    }
    // Let's send for all for now.

    const html = getTransactionReceiptTemplate({
        name: user.full_name || 'AfroPitch User',
        currency: CURRENCY,
        amount: record.amount,
        transactionType: record.type,
        date: new Date(record.created_at).toDateString(),
        referenceId: record.id.split('-')[0], // Short ID
        description: record.description || 'Transaction',
        paymentMethod: 'Wallet/System',
        dashboardLink: `${SITE_URL}/dashboard/artist` // Generic link, role detection tough here without more queries
    });

    await sendEmail(user.email, subject, html);
}

async function handleSubmissionInsert(record: any) {
    // 1. Get Playlist & Curator ID
    const { data: playlist } = await supabase.from('playlists').select('name, curator_id').eq('id', record.playlist_id).single();
    if (!playlist || !playlist.curator_id) {
        console.error("Playlist/Curator not found for submission:", record.id);
        return;
    }

    // 2. Get Curator Email
    const curator = await getUserEmail(playlist.curator_id);
    if (!curator || !curator.email) {
        console.error("Curator email not found:", playlist.curator_id);
        return;
    }

    // 3. Get Artist Name (Optional)
    const artist = await getUserEmail(record.artist_id); // Returns name too
    const artistName = artist?.full_name || 'An Artist';

    // 4. Send Email to Curator
    const subject = `New Submission: ${record.song_title} for ${playlist.name}`;
    const html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #16a34a;">New Song Submission!</h2>
            <p>Hi ${curator.full_name},</p>
            <p>You have received a new submission from <strong>${artistName}</strong> for your playlist <strong>${playlist.name}</strong>.</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Song:</strong> ${record.song_title}</p>
                <p style="margin: 5px 0;"><strong>Tier:</strong> ${record.tier ? record.tier.toUpperCase() : 'STANDARD'}</p>
            </div>
            <p>Login to your dashboard to review it and earn your fee.</p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="${SITE_URL}/dashboard/curator" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">Review Submission</a>
            </div>
             <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px;">
                &copy; ${new Date().getFullYear()} AfroPitch Playlist.
            </p>
        </div>
    `;

    await sendEmail(curator.email, subject, html);
}

async function handleSubmissionUpdate(record: any) {
    const user = await getUserEmail(record.artist_id);
    if (!user || !user.email) return;

    // Fetch Playlist Info for names
    const { data: playlist } = await supabase.from('playlists').select('name, playlist_link, curator_id').eq('id', record.playlist_id).single();
    const playlistName = playlist?.name || 'Unknown Playlist';
    const playlistLink = playlist?.playlist_link || '#';

    // Fetch Curator Name
    let curatorName = 'AfroPitch Curator';
    if (playlist?.curator_id) {
        const { data: curator } = await supabase.from('profiles').select('full_name').eq('id', playlist.curator_id).single();
        curatorName = curator?.full_name || curatorName;
    }

    if (record.status === 'accepted') {
        const subject = `Congratulations! Your song was approved for ${playlistName}`;
        const trackingLink = record.tracking_slug ? `${SITE_URL}/track/${record.tracking_slug}` : `${SITE_URL}/dashboard/artist`;

        const html = getSongApprovedTemplate({
            name: user.full_name || 'Artist',
            songTitle: record.song_title,
            playlistName: playlistName,
            curatorName: curatorName,
            playlistLink: playlistLink,
            dashboardLink: `${SITE_URL}/dashboard/artist`,
            trackingLink: trackingLink
        });
        await sendEmail(user.email, subject, html);
    }
    else if (record.status === 'declined') {
        const subject = `Update on your submission to ${playlistName}`;
        const html = getSongDeclinedTemplate({
            name: user.full_name || 'Artist',
            songTitle: record.song_title,
            playlistName: playlistName,
            feedback: record.feedback || 'No specific feedback provided.',
            refundAmount: `${CURRENCY}${record.amount_paid}`,
            dashboardLink: `${SITE_URL}/dashboard/artist`
        });
        await sendEmail(user.email, subject, html);
    }
}

async function handleRankingBoost(record: any) {
    const user = await getUserEmail(record.artist_id);
    if (!user || !user.email) return;

    const { data: playlist } = await supabase.from('playlists').select('name').eq('id', record.playlist_id).single();
    const playlistName = playlist?.name || 'AfroPitch Playlist';
    const trackingLink = record.tracking_slug ? `${SITE_URL}/track/${record.tracking_slug}` : `${SITE_URL}/dashboard/artist`;

    const subject = `Your song "${record.song_title}" is trending on ${playlistName} 🚀`;
    const html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #16a34a;">Great news!</h2>
            <p>Your song <strong>${record.song_title}</strong> has just climbed up the rankings on <strong>${playlistName}</strong>.</p>
            <p>We are pushing it to more listeners right now. Please keep sharing your tracking link to boost your ranking even higher and trend!</p>
            <div style="text-align: center; margin-top: 30px;">
                <a href="${trackingLink}" style="background:#16a34a;color:white;padding:14px 28px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">View & Share Link</a>
            </div>
            <p style="font-size: 13px; color: #777; text-align: center; margin-top: 40px;">
                &copy; ${new Date().getFullYear()} AfroPitch Playlist.
            </p>
        </div>
    `;

    await sendEmail(user.email, subject, html);
}

async function handleWithdrawalUpdate(record: any) {
    // If approved, money leaves system (managed manually or via payout API elsewhere).
    // If rejected, money refunded (handled by app logic usually, transaction inserted).
    // The TRANSACTION trigger handles the refund receipt/money receipt.
    // This handler purely notifies of STATUS change.

    const user = await getUserEmail(record.user_id);
    if (!user || !user.email) return;

    const subject = `Withdrawal Update: ${record.status.toUpperCase()}`;
    const html = `
    <h1>Withdrawal Update</h1>
    <p>Your withdrawal request for ${CURRENCY}${record.amount} has been <strong>${record.status}</strong>.</p>
    <p>Please check your dashboard for details.</p>
    `;
    // reusing generic or creating simple one.
    // Since I have transaction receipt, that covers the financial movement. 
    // This is just a status alert.

    await sendEmail(user.email, subject, html);
}

async function handleSupportInsert(record: any) {
    // Acknowledgement to the person who opened the ticket.
    let toEmail: string | null = null;
    let name = 'there';
    let fromLabel = 'Website visitor';
    if (record.user_id) {
        const u = await getUserEmail(record.user_id);
        if (u?.email) { toEmail = u.email; name = u.full_name || 'there'; fromLabel = `${name} (${u.email})`; }
    } else if (record.contact_email) {
        toEmail = record.contact_email;
        const m = String(record.message || '').match(/^From:\s*(.+?)\s*</);
        if (m) name = m[1];
        fromLabel = `${name} (${toEmail})`;
    }
    if (toEmail) {
        const html = getSupportTicketReceivedTemplate({
            name,
            subject: record.subject,
            dashboardLink: record.user_id ? `${SITE_URL}/dashboard/artist` : SITE_URL,
        });
        await sendEmail(toEmail, `Support ticket received: ${record.subject}`, html);
    }
    // Notify the admin so chat tickets don't sit unseen.
    const adminHtml = getSupportTicketAdminTemplate({
        subject: record.subject,
        from: fromLabel,
        snippet: String(record.message || '').replace(/^From:.*\n\n/, '').slice(0, 400),
        dashboardLink: `${SITE_URL}/dashboard/admin`,
    });
    await sendEmail('admin@afropitchplay.best', `New support ticket: ${record.subject}`, adminHtml);
}

async function handleSupportUpdate(record: any) {
    const user = await getUserEmail(record.user_id);
    if (!user || !user.email) return;

    const subject = `Support Ticket Update: ${record.subject}`;
    const html = getSupportTicketTemplate({
        name: user.full_name || 'User',
        subject: record.subject,
        status: record.status,
        dashboardLink: `${SITE_URL}/dashboard` // generic
    });

    await sendEmail(user.email, subject, html);
}

async function handleCuratorApplicationUpdate(record: any) {
    const email = record.email;
    if (!email) return;
    const name = record.name || 'Curator';

    if (record.status === 'approved') {
        const subject = `You're In! Your AfroPitch curator application was approved \u{1F389}`;
        const html = getCuratorApprovedTemplate({
            name,
            playlistLink: record.playlist_link || '',
            signupLink: `${SITE_URL}/signup`,
        });
        await sendEmail(email, subject, html);
    } else if (record.status === 'rejected') {
        const subject = `Update on your AfroPitch curator application`;
        const html = getCuratorRejectedTemplate({
            name,
            dashboardLink: SITE_URL,
        });
        await sendEmail(email, subject, html);
    }
}
async function handleMixingMessage(record: any) {
    // record: { id, order_id, sender_id, body, created_at }
    const { data: sender } = await supabase.from('profiles').select('id, role').eq('id', record.sender_id).single();
    if (!sender) return;
    const { data: order } = await supabase.from('mixing_orders').select('id, song_title, artist_id').eq('id', record.order_id).single();
    if (!order) return;
    // Email the artist only when the engineer (admin) replies.
    // Artist -> admin messages are visible in the admin dashboard.
    if (sender.role === 'admin' && order.artist_id !== record.sender_id) {
        const artist = await getUserEmail(order.artist_id);
        if (!artist || !artist.email) return;
        const subject = `New message about your mix: ${order.song_title}`;
        const html = getMixingMessageTemplate({
            name: artist.full_name || 'Artist',
            songTitle: order.song_title,
            snippet: String(record.body || '').slice(0, 300),
            dashboardLink: `${SITE_URL}/dashboard/artist`,
        });
        await sendEmail(artist.email, subject, html);
    }
}


async function handleMixingRefund(record: any, old: any) {
    // record: mixing_orders row after UPDATE
    const requested = !old?.refund_requested_at && record.refund_requested_at;
    const denied = old?.refund_requested_at && !record.refund_requested_at && record.status !== 'refunded';
    // Approved refunds are announced by the 'refund' transaction receipt email.
    if (!requested && !denied) return;

    const artist = await getUserEmail(record.artist_id);
    const artistName = artist?.full_name || 'Artist';

    if (requested) {
        const subject = `Refund requested: ${record.song_title} (${CURRENCY}${Number(record.amount).toLocaleString()})`;
        const html = getMixingRefundRequestTemplate({
            songTitle: record.song_title,
            packageName: record.package_name,
            amount: `${CURRENCY}${Number(record.amount).toLocaleString()}`,
            artistName,
            reason: record.refund_request_reason || 'No reason given.',
            dashboardLink: `${SITE_URL}/dashboard/admin`,
        });
        await sendEmail('admin@afropitchplay.best', subject, html);
    } else if (denied) {
        if (!artist || !artist.email) return;
        const subject = `Update on your refund request: ${record.song_title}`;
        const html = getMixingRefundDeniedTemplate({
            name: artist.full_name || 'Artist',
            songTitle: record.song_title,
            dashboardLink: `${SITE_URL}/dashboard/artist`,
        });
        await sendEmail(artist.email, subject, html);
    }
}

function b64urlEncodeStr(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signUnsubscribeToken(email: string, secret: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalized));
    const sigBytes = new Uint8Array(sig);
    let bin = "";
    for (const b of sigBytes) bin += String.fromCharCode(b);
    const sigB64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `${b64urlEncodeStr(normalized)}.${sigB64}`;
}

async function handleBroadcast(record: any) {
    console.log("📢 Starting Broadcast:", record.subject);

    const channel = record.channel || 'both';
    const wantsEmail = channel === 'email' || channel === 'both';
    const wantsInApp = channel === 'in_app' || channel === 'both';

    // 1. Recipients come from the profiles table (source of truth for role),
    //    not auth user_metadata. Page through in batches of 1000.
    const recipients: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role, full_name')
            .not('email', 'is', null)
            .range(page * 1000, page * 1000 + 999);
        if (error) {
            console.error("Failed to list profiles for broadcast:", error);
            return;
        }
        if (!data || data.length === 0) break;
        recipients.push(...data);
        if (data.length < 1000) break;
        page++;
    }

    console.log(`Found ${recipients.length} profiles.`);

    // 2. Unsubscribed addresses never get broadcast email.
    const { data: unsubRows } = await supabase
        .from('email_unsubscribes')
        .select('email');
    const unsubscribed = new Set(
        (unsubRows || []).map((r: any) => (r.email || "").trim().toLowerCase())
    );

    // 3. Secret for signed per-recipient unsubscribe links (best effort).
    let unsubSecret: string | null = null;
    try {
        const { data } = await supabase.rpc('get_unsubscribe_secret');
        if (data) unsubSecret = data as string;
    } catch { /* footer link omitted */ }

    // 2. Iterate and Send
    const targetRole = record.target_role || 'all';
    let sentCount = 0;
    let inAppCount = 0;
    let skippedUnsub = 0;

    for (const p of recipients) {
        const email = (p.email || "").trim();
        if (!email) continue;

        // Filter by role from the profiles table
        const userRole = p.role || 'artist';
        if (targetRole !== 'all' && userRole !== targetRole) {
            continue;
        }

        const userName = p.full_name || email.split('@')[0] || 'User';
        const subject = record.subject.replace(/{{name}}/g, userName).replace(/{{username}}/g, userName);

        // Process message body for placeholders
        let messageBody = record.message
            .replace(/{{name}}/g, userName)
            .replace(/{{username}}/g, userName);

        if (wantsInApp) {
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: p.id,
                title: subject,
                message: messageBody,
                is_read: false,
            });
            if (notifError) {
                console.error(`In-app notification failed for ${email}:`, notifError.message);
            } else {
                inAppCount++;
            }
        }

        if (wantsEmail) {
            if (unsubscribed.has(email.toLowerCase())) {
                skippedUnsub++;
                continue;
            }

            // Convert newlines to breaks if it looks like plain text
            let htmlBody = messageBody;
            if (!htmlBody.includes('<p>') && !htmlBody.includes('<div>')) {
                htmlBody = htmlBody.replace(/\n/g, '<br/>');
            }

            let unsubFooter = "";
            let listUnsubHeaders: Record<string, string> = {};
            if (unsubSecret) {
                const token = await signUnsubscribeToken(email, unsubSecret);
                const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
                unsubFooter = `<p style="font-size: 12px; color: #777; text-align: center;"><a href="${unsubUrl}">Unsubscribe</a></p>`;
                listUnsubHeaders = {
                    "List-Unsubscribe": `<${unsubUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                };
            }

            const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #16a34a;">${subject}</h2>
                <div style="font-size: 16px; line-height: 1.5;">${htmlBody}</div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777; text-align: center;">
                    You received this message from AfroPitch Admin.<br/>
                    &copy; ${new Date().getFullYear()} AfroPitch Playlist.
                </p>
                ${unsubFooter}
            </div>
        `;

            await sendEmail(email, subject, html, listUnsubHeaders);
            sentCount++;
            // Rate limit
            await new Promise(r => setTimeout(r, 200));
        }
    }
    console.log(`✅ Broadcast complete. Email sent: ${sentCount} (skipped ${skippedUnsub} unsubscribed), in-app: ${inAppCount} (Target: ${targetRole}).`);
}

async function sendEmail(to: string, subject: string, html: string, headers?: Record<string, string>) {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    try {
        const { data, error } = await resend.emails.send({
            from: 'AfroPitch <notifications@afropitchplay.best>', // Using the new domain
            to: [to],
            subject: subject,
            html: html,
            ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
        });

        if (error) {
            console.error('Resend API Error:', error);
        } else {
            console.log('Email sent successfully:', data);
        }
    } catch (e) {
        console.error("Exception sending email:", e);
    }
}
