
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const WEBHOOK_URL = Deno.env.get('ADMIN_WEBHOOK_URL');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://afropitchplay.best';

// Lazy init Supabase to prevent startup crashes
const getSupabase = () => {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
        console.error("Missing SUPABASE env vars");
        return null;
    }
    try {
        return createClient(url, key);
    } catch (e) {
        console.error("Supabase Client Init Error:", e);
        return null;
    }
};

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
        console.error("Missing ADMIN_WEBHOOK_URL - Notifications will fail silently");
    }

    let payload;
    let bodyText = "";

    try {
        bodyText = await req.text();
        if (!bodyText) {
            console.log("Empty body received. Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
            return new Response("Empty Body", { status: 200, headers: corsHeaders });
        }

        try {
            payload = JSON.parse(bodyText);
        } catch (e) {
            console.error("JSON Parse Error. Raw Body Preview:", bodyText.substring(0, 500));
            return new Response("Invalid JSON", { status: 200, headers: corsHeaders });
        }
    } catch (e) {
        console.error("Body Read Error:", e);
        return new Response("Body Read Error", { status: 500, headers: corsHeaders });
    }

    console.log("🚨 FULL PAYLOAD RECEIVED:", JSON.stringify(payload));

    try {
        if (!payload || typeof payload !== 'object') {
            console.log("Payload is not an object");
            return new Response("Invalid Payload Structure", { status: 200, headers: corsHeaders });
        }

        const { table, type, record, schema, event_type, user_data } = payload;
        console.log(`🔔 Admin Notification: ${table || event_type}`);

        let message = "";
        let details = "";

        // Get Client lazily
        const supabase = getSupabase();

        // --- DB EVENT HANDLERS ---

        // 1. New User (Profiles Insert)
        if (table === 'profiles' && type === 'INSERT') {
            message = `👤 **New User Registered**`;
            details = `Email: ${record.email || 'N/A'}\nName: ${record.full_name || 'N/A'}\nRole: ${record.role}`;
        }

        // 2. Curator Verification (Profiles Update)
        else if (table === 'profiles' && type === 'UPDATE') {
            const newStatus = record.verification_status;
            const oldStatus = payload.old_record?.verification_status;

            console.log("Profile Update Debug:", { new_status: newStatus, old_status: oldStatus, role: record.role });

            if (newStatus === 'verified' && oldStatus !== 'verified') {
                message = `✅ **Curator Verified**`;
                details = `Curator: ${record.full_name}\nEmail: ${record.email}`;
            } else if (newStatus === 'pending') {
                message = `📝 **New Curator Verification Request**`;
                details = `User: ${record.full_name}\nEmail: ${record.email}\nNIN: ${record.nin_number || 'N/A'}`;
            } else if (record.role === 'curator' && payload.old_record?.role !== 'curator') {
                message = `🎓 **User Promoted to Curator**`;
                details = `User: ${record.full_name} (${record.email})`;
            }
        }

        // 3. New Submission (Submissions Insert)
        else if (table === 'submissions' && type === 'INSERT') {
            message = `🎵 **New Song Submission**`;
            details = `Song: ${record.song_title}\nArtist ID: ${record.artist_id}\nPlaylist ID: ${record.playlist_id}\nAmount: ₦${record.amount_paid}`;
            // Enrich
            if (supabase) {
                const { data: artist } = await supabase.from('profiles').select('full_name, email').eq('id', record.artist_id).single();
                if (artist) details += `\nArtist: ${artist.full_name} (${artist.email})`;
            }
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

        // 6. Withdrawal Request 
        else if (table === 'withdrawals' && type === 'INSERT') {
            message = `🏦 **New Payout Request**`;
            details = `Amount: ₦${record.amount}\nUser ID: ${record.user_id}\nType: Wallet Withdrawal`;
        }

        // 7. Support Ticket
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
        else if (event_type === 'MANUAL_LOG' || payload.type === 'MANUAL_TEST') {
            message = `📝 **System Log / Test**`;
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
        console.error("Logic Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

async function postToWebhook(title: string, description: string) {
    const payload = {
        content: title ? `${title}\n${description}` : description,
        username: "AfroPitch Bot"
    };

    try {
        const res = await fetch(WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error("Webhook failed:", errText);
        } else {
            console.log("Webhook sent successfully");
        }
    } catch (err) {
        console.error("Webhook fetch error:", err);
    }
}
