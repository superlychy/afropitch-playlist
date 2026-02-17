import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1472981564798271498/zg5haArHXWiZafcVWDiJ4ofx_RPIk8IKvjYTwbQPFLiq9xh9GYiYe9Iium28hEb9P6fb";

serve(async (req) => {
    // Basic Request Handling
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const payload = await req.json();
        const type = payload.type; // Resend usually sends 'type' like 'email.sent', 'email.delivered', etc.
        const data = payload.data || {};

        let title = "Using Resend Webhook";
        let color = 3447003; // Default Blue
        let description = "";
        const fields = [];

        // 1. Handle Inbound Email (Received)
        if (type === 'email.delivered' || type === 'email.sent' || type === 'email.opened' || type === 'email.clicked' || type === 'email.bounced' || type === 'email.complained') {
            title = `Update: ${type.toUpperCase()}`;

            if (type === 'email.delivered' || type === 'email.sent') color = 5763719; // Green
            if (type === 'email.bounced' || type === 'email.complained') color = 15548997; // Red

            description = `Email ID: ${data.email_id || 'N/A'}`;
            fields.push({
                name: "To",
                value: Array.isArray(data.to) ? data.to.join(", ") : (data.to || 'Unknown'),
                inline: true
            });
            fields.push({
                name: "Subject",
                value: data.subject || "No Subject",
                inline: true
            });
            if (data.from) {
                fields.push({ name: "From", value: data.from, inline: true });
            }
        } else if (payload.id && payload.from && payload.subject) {
            // Likely an Inbound Email Structure (received)
            title = "New Email Received 📬";
            color = 5763719; // Green

            fields.push({
                name: "From",
                value: `${payload.from} <${payload.original_sender || ''}>`,
                inline: true
            });
            fields.push({
                name: "To",
                value: Array.isArray(payload.to) ? payload.to.join(", ") : (payload.to || 'Unknown'),
                inline: true
            });
            fields.push({
                name: "Subject",
                value: payload.subject || "No Subject",
                inline: false
            });

            // Getting a snippet of the body
            let bodySnippet = payload.text || payload.html || "No Content";
            if (bodySnippet.length > 200) bodySnippet = bodySnippet.substring(0, 200) + "...";
            description = bodySnippet;
        } else {
            // Unknown type
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
                    footer: {
                        text: "AfroPitch Notifier • Powered by Resend"
                    }
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
