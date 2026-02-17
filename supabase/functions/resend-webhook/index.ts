import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    // Basic Request Handling
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 1. Initialize Supabase Client (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch the Secret from Database Vault via RPC
    const { data: webhookUrl, error: secretError } = await supabase.rpc('get_discord_webhook');

    if (secretError || !webhookUrl) {
        console.error("Failed to retrieve secret from DB Vault:", secretError);
        return new Response("Configuration Error: Missing Secret in Vault", { status: 500 });
    }

    const DISCORD_WEBHOOK_URL = webhookUrl as string;

    try {
        const payload = await req.json();
        const type = payload.type;
        const data = payload.data || {};

        let title = "Using Resend Webhook";
        let color = 3447003; // Default Blue
        let description = "";
        const fields = [];

        // Handle Resend Events
        if (type === 'email.delivered' || type === 'email.sent' || type === 'email.opened' || type === 'email.clicked' || type === 'email.bounced' || type === 'email.complained') {
            title = `Update: ${type.toUpperCase()}`;
            if (type === 'email.delivered' || type === 'email.sent') color = 5763719; // Green
            if (type === 'email.bounced' || type === 'email.complained') color = 15548997; // Red

            fields.push({ name: "To", value: Array.isArray(data.to) ? data.to.join(", ") : (data.to || 'Unknown'), inline: true });
            fields.push({ name: "Subject", value: data.subject || "No Subject", inline: true });
            description = `Email ID: ${data.email_id || 'N/A'}`;
        }
        // Handle Inbound
        else if (payload.from && payload.subject) {
            title = "New Email Received 📬";
            color = 5763719;

            fields.push({ name: "From", value: payload.from, inline: true });
            fields.push({ name: "Subject", value: payload.subject, inline: false });

            let bodySnippet = payload.text || payload.html || "No Content";
            if (bodySnippet.length > 200) bodySnippet = bodySnippet.substring(0, 200) + "...";
            description = bodySnippet;
        } else {
            title = "Unknown Resend Event";
            description = `Start of payload: ${JSON.stringify(payload).substring(0, 500)}`;
        }

        // Construct Discord Payload
        const discordBody = {
            embeds: [
                {
                    title: title,
                    description: description,
                    color: color,
                    fields: fields,
                    timestamp: new Date().toISOString(),
                    footer: { text: "AfroPitch Notifier • Powered by Resend" }
                }
            ]
        };

        // Send to Discord
        const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordBody)
        });

        if (!discordRes.ok) {
            const errText = await discordRes.text();
            console.error("Discord Error:", errText);
            return new Response(`Discord Error: ${errText}`, { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
