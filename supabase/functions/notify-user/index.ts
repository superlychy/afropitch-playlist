
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'resend';
import { getTransactionReceiptTemplate, getSongApprovedTemplate, getSongDeclinedTemplate, getSupportTicketTemplate } from './templates.ts';

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
            } else if (type === 'INSERT') {
                await handleSubmissionInsert(record);
            }
        } else if (table === 'withdrawals' && type === 'UPDATE') {
            if (record.status !== payload.old_record?.status) {
                await handleWithdrawalUpdate(record);
            }
        } else if (table === 'support_tickets' && type === 'UPDATE') {
            // Notify on status change or response? Usually status change is a good proxy or explicit 'has_unread'
            // Simplicity: Notify if status changed to 'open' (reply) or 'closed'
            if (record.status !== payload.old_record?.status) {
                await handleSupportUpdate(record);
            }
        } else if (table === 'broadcasts' && type === 'INSERT') {
            await handleBroadcast(record);
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

async function handleBroadcast(record: any) {
    console.log("📢 Starting Broadcast:", record.subject);

    if (record.channel === 'in_app') {
        console.log("Skipping email for in-app only broadcast.");
        return;
    }

    // 1. Fetch All Users (Page through if needed, but for now max 1000)
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ per_page: 1000 });

    if (error || !users) {
        console.error("Failed to list users for broadcast:", error);
        return;
    }

    console.log(`Found ${users.length} users.`);

    // 2. Iterate and Send
    const targetRole = record.target_role || 'all';
    let sentCount = 0;

    for (const u of users) {
        if (!u.email) continue;

        // Filter by role
        const userRole = u.user_metadata?.role || (u.email.includes("curator") ? "curator" : "artist");
        if (targetRole !== 'all' && userRole !== targetRole) {
            continue;
        }

        const userName = u.user_metadata?.full_name || u.email.split('@')[0] || 'User';
        const subject = record.subject.replace(/{{name}}/g, userName).replace(/{{username}}/g, userName);

        // Process message body for placeholders
        let messageBody = record.message
            .replace(/{{name}}/g, userName)
            .replace(/{{username}}/g, userName);

        // Convert newlines to breaks if it looks like plain text
        if (!messageBody.includes('<p>') && !messageBody.includes('<div>')) {
            messageBody = messageBody.replace(/\n/g, '<br/>');
        }

        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #16a34a;">${subject}</h2>
                <div style="font-size: 16px; line-height: 1.5;">${messageBody}</div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777; text-align: center;">
                    You received this message from AfroPitch Admin.<br/>
                    &copy; ${new Date().getFullYear()} AfroPitch Playlist.
                </p>
            </div>
        `;

        await sendEmail(u.email, subject, html);
        sentCount++;
        // Rate limit
        await new Promise(r => setTimeout(r, 200));
    }
    console.log(`✅ Broadcast complete. Sent to ${sentCount} users (Target: ${targetRole}).`);
}

async function sendEmail(to: string, subject: string, html: string) {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    try {
        const { data, error } = await resend.emails.send({
            from: 'AfroPitch <notifications@afropitchplay.best>', // Using the new domain
            to: [to],
            subject: subject,
            html: html,
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
