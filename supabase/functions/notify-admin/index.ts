
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_URL = Deno.env.get('ADMIN_WEBHOOK_URL');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://afropitchplay.best';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    if (!WEBHOOK_URL) {
        console.error("Missing ADMIN_WEBHOOK_URL");
        return new Response("Configuration Error", { status: 500, headers: corsHeaders });
    }

    try {
        let payload;
        try {
            payload = await req.json();
        } catch (jsonErr) {
            console.error("Failed to parse JSON body:", jsonErr);
            const textBody = await req.text();
            console.error("RAW BODY RECEIVED:", textBody);
            return new Response("Invalid JSON Body", { status: 400, headers: corsHeaders });
        }

        console.log("🚨 FULL PAYLOAD RECEIVED:", JSON.stringify(payload)); // DEBUG LOG

        const { table, type, record, schema, event_type, user_data } = payload;

        console.log(`🔔 Admin Notification: ${table || event_type}`);

        let message = "";
        let details = "";

        // --- DB EVENT HANDLERS ---

        // 1. New User (Profiles Insert)
        if (table === 'profiles' && type === 'INSERT') {
            message = `👤 **New User Registered**`;
            details = `Email: ${record.email || 'N/A'}\nName: ${record.full_name || 'N/A'}\nRole: ${record.role}`;
        }

        // 2. Curator Verification (Profiles Update)
        else if (table === 'profiles' && type === 'UPDATE') {
            if (record.verification_status === 'verified' && payload.old_record?.verification_status !== 'verified') {
                message = `✅ **Curator Verified**`;
                details = `Curator: ${record.full_name}\nEmail: ${record.email}`;
            } else if (record.role === 'curator' && payload.old_record?.role !== 'curator') {
                message = `🎓 **User Promoted to Curator**`;
                details = `User: ${record.full_name} (${record.email})`;
            }
        }

        // 3. New Submission (Submissions Insert)
        else if (table === 'submissions' && type === 'INSERT') {
            message = `🎵 **New Song Submission**`;
            details = `Song: ${record.song_title}\nArtist ID: ${record.artist_id}\nPlaylist ID: ${record.playlist_id}\nAmount: ₦${record.amount_paid}`;

            // Enrich with names if possible (async lookup)
            const { data: artist } = await supabase.from('profiles').select('full_name, email').eq('id', record.artist_id).single();
            if (artist) details += `\nArtist: ${artist.full_name} (${artist.email})`;
        }

        // 4. New Playlist (Playlists Insert)
        else if (table === 'playlists' && type === 'INSERT') {
            message = `wf **New Playlist Created**`;
            details = `Name: ${record.name}\nCurator ID: ${record.curator_id}\nLink: ${record.playlist_link}`;
        }

        // 5. New Transaction (Transactions Insert)
        else if (table === 'transactions' && type === 'INSERT') {
            message = `💰 **New Transaction**`;
            details = `Type: ${record.type}\nAmount: ₦${record.amount}\nUser ID: ${record.user_id}`;
        }

        // 6. Withdrawal Request (Withdrawals Insert/Update)
        // If checking 'withdrawals' table directly or 'transactions' with type 'withdrawal'
        else if (table === 'withdrawals' && type === 'INSERT') {
            message = `🏦 **New Payout Request**`;
            details = `Amount: ₦${record.amount}\nUser ID: ${record.user_id}\nType: Wallet Withdrawal`;
        }

        // 7. Support Ticket (Support Tickets Insert)
        else if (table === 'support_tickets' && type === 'INSERT') {
            message = `🎫 **New Support Ticket**`;
            details = `Subject: ${record.subject}\nUser ID: ${record.user_id}\nStatus: ${record.status}`;
        }

        // 8. Curator Application (New Request)
        else if (table === 'curator_applications' && type === 'INSERT') {
            message = `📝 **New Curator Application**`;
            details = `Name: ${record.name}\nEmail: ${record.email}\nPlaylist: ${record.playlist_link}`;
        }

        // --- MANUAL EVENT HANDLERS ---
        else if (event_type === 'ADMIN_LOGIN') {
            message = `🛡️ **Admin Logged In**`;
            details = `User: ${user_data?.email || 'Unknown'}\nTime: ${new Date().toLocaleString()}`;
        }
        else if (event_type === 'MANUAL_LOG') {
            message = `📝 **System Log**`;
            details = payload.message || JSON.stringify(payload);
        }

        // Send to Webhook (if message generated)
        if (message) {
            await postToWebhook(message, details);
            return new Response(JSON.stringify({ success: true, msg: "Notification Sent" }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
            return new Response(JSON.stringify({ success: true, msg: "No notification criteria met" }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

    } catch (e) {
        console.error("Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

async function postToWebhook(title: string, description: string) {
    const payload = {
        // Discord Format
        content: `${title}\n${description}`,
        // Slack Format
        text: `${title}\n${description}`,
        // Generic JSON
        message: title,
        details: description
    };

    try {
        const res = await fetch(WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.error("Webhook failed:", await res.text());
        }
    } catch (err) {
        console.error("Webhook fetch error (Check ADMIN_WEBHOOK_URL config):", err);
        // Do not throw, just log.
    }
}
