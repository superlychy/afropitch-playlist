
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
        }

        return new Response(JSON.stringify({ message: "Notification processed" }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error("Error processing notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});

// --- Handlers ---

async function getUserEmail(userId: string) {
    const { data: profile, error } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();
    if (error || !profile) {
        console.error("Could not find user profile:", userId);
        return null;
    }
    return profile;
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
