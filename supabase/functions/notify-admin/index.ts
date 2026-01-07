
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
            message = `💿 **New Playlist Created**`;
            details = `Name: ${record.name}\nCurator ID: ${record.curator_id}`;
            if (supabase) {
                const { data: curator } = await supabase.from('profiles').select('full_name').eq('id', record.curator_id).single();
                if (curator) details += `\nCurator: ${curator.full_name}`;
            }
        }

        // 5. Withdrawal Request (Withdrawals Insert)
        else if (table === 'withdrawals' && type === 'INSERT') {
            message = `💰 **New Withdrawal Request**`;
            details = `Amount: ₦${record.amount}\nUser ID: ${record.user_id}\nBank: ${record.bank_name}`;
            if (supabase) {
                const { data: user } = await supabase.from('profiles').select('full_name, email').eq('id', record.user_id).single();
                if (user) details += `\nUser: ${user.full_name} (${user.email})`;
            }
        }

        // 6. Support Ticket (Support_Tickets Insert)
        else if (table === 'support_tickets' && type === 'INSERT') {
            message = `🎫 **New Support Ticket**`;
            details = `Subject: ${record.subject}\nUser ID: ${record.user_id}`;
            if (supabase) {
                const { data: user } = await supabase.from('profiles').select('full_name, email').eq('id', record.user_id).single();
                if (user) details += `\nUser: ${user.full_name} (${user.email})`;
            }
        }

        // 7. Manual Test / Log
        else if (event_type === 'MANUAL_LOG' || payload.type === 'MANUAL_TEST') {
            message = `📝 **System Log / Test**`;
            details = payload.message || JSON.stringify(payload);
        }

        else if (event_type === 'ADMIN_LOGIN') {
            message = `🔑 **Admin Login**`;
            details = `Admin: ${user_data?.email || 'Unknown'}`;
        }

        else if (event_type === 'CHAT_MESSAGE') {
            message = `💬 **Live Chat Question**`;
            details = `User: ${user_data?.email || 'Guest'}\nMessage: ${payload.message}`;
            if (user_data?.id) details += `\nUser ID: ${user_data.id}`;
        }

        // --- SEND TO DISCORD ---
        if (message) {
            console.log("Sending Webhook:", message);
            await postToWebhook(message, details);
            return new Response("Notification Sent", { status: 200, headers: corsHeaders });
        }

        console.log("No matching event handler for payload.");
        return new Response("Event Ignored", { status: 200, headers: corsHeaders });

    } catch (e) {
        console.error("Logic Error:", e);
        // Return 200 with error details to avoid Client Generic Error
        return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

async function postToWebhook(title: string, description: string) {
    if (!WEBHOOK_URL) {
        console.warn("Skipping Webhook - No URL Configured");
        return;
    }

    const payload = {
        content: title ? `${title}\n${description}` : description,
        username: "AfroPitch Bot"
    };

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error(`Webhook Failed [${res.status}]: ${txt}`);
        } else {
            console.log("Webhook Sent Successfully");
        }
    } catch (e) {
        console.error("Webhook Fetch Error:", e);
    }
}
