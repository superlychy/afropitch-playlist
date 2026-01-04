
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'resend';
import { getTransactionReceiptTemplate, getSongApprovedTemplate, getSongDeclinedTemplate, getSupportTicketTemplate } from './templates.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const CURRENCY = '₦';

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
        } else if (table === 'submissions' && type === 'UPDATE') {
            // Only notify if status changed
            if (record.status !== payload.old_record?.status) {
                await handleSubmissionUpdate(record);
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

    // Skip small earnings notifications if frequent? User asked for "all necessary places".
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
        dashboardLink: 'https://afropitch.vercel.app/dashboard/artist' // Generic link, role detection tough here without more queries
    });

    await sendEmail(user.email, subject, html);
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
        const html = getSongApprovedTemplate({
            name: user.full_name || 'Artist',
            songTitle: record.song_title,
            playlistName: playlistName,
            curatorName: curatorName,
            playlistLink: playlistLink,
            dashboardLink: 'https://afropitch.vercel.app/dashboard/artist'
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
            dashboardLink: 'https://afropitch.vercel.app/dashboard/artist'
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
        dashboardLink: 'https://afropitch.vercel.app/dashboard' // generic
    });

    await sendEmail(user.email, subject, html);
}

async function handleBroadcast(record: any) {
    console.log("📢 Starting Broadcast:", record.subject);

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

        // Optional: Filter by role if metadata present
        // if (targetRole !== 'all' && u.user_metadata?.role !== targetRole) continue;

        const subject = record.subject;
        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #16a34a;">${record.subject}</h2>
                <div style="white-space: pre-wrap; font-size: 16px; line-height: 1.5;">${record.message}</div>
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
    console.log(`✅ Broadcast complete. Sent to ${sentCount} users.`);
}

async function sendEmail(to: string, subject: string, html: string) {
    console.log(`📧 Sending email to ${to}: ${subject}`);
    try {
        const { data, error } = await resend.emails.send({
            from: 'AfroPitch <notifications@afropitch.com>', // User needs to verify domain or use onboard
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
