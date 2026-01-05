
const fs = require('fs');
const path = require('path');
const https = require('https'); // Use https.request instead of fetch if fetch is unavailable in Node 16/old, but node 18+ has fetch. 
// We will try fetch first, assuming modern node. If invalid, we use https.

async function run() {
    try {
        console.log("Reading .env.local...");
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error(".env.local file not found at", envPath);
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/RESEND_API_KEY\s*=\s*(.+)/);

        if (!match) {
            console.error("RESEND_API_KEY not found in .env.local");
            return;
        }

        const apiKey = match[1].trim().replace(/['"]/g, ''); // Remove quotes if present

        if (apiKey.length < 5) {
            console.error("API Key seems too short.");
            return;
        }

        console.log(`Found API Key: ${apiKey.substring(0, 5)}...${apiKey.slice(-3)}. Sending test email...`);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'AfroPitch <notifications@afropitchplay.best>',
                // If domain not verified, Resend only allows sending to the email registered (the account email). 
                // The user said "send me a test email to my email everlastinglifey@gmail.com".
                // If notifications@afropitch.com is not verified, this might fail unless using 'onboarding@resend.dev'
                // Let's try the user's domain first, if fail, fallback suggestion.
                to: ['everlastinglifey@gmail.com'],
                subject: 'AfroPitch Test Email',
                html: '<h1>It Works!</h1><p>This is a test email from your AfroPitch local script.</p>'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Email sent successfully!", data);
        } else {
            console.error("❌ Failed to send email:", data);
        }

    } catch (err) {
        console.error("Script Error:", err);
    }
}

run();
