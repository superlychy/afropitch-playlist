// Test the deployed function (Node.js version)
const FUNCTION_URL = "https://gildytqinnntmtvbagxm.supabase.co/functions/v1/resend-webhook";

async function testWebhook() {
    console.log("Testing Resend Webhook...");

    const payload = {
        type: "email.sent",
        created_at: new Date().toISOString(),
        data: {
            created_at: new Date().toISOString(),
            email_id: "test_" + Math.random().toString(36).substring(7),
            to: ["test@example.com"],
            subject: "Test Email from Script (Node.js)"
        }
    };

    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("✅ Success! Check your Discord channel.");
            console.log(data);
        } else {
            const text = await response.text();
            console.error("❌ Error:", response.status, text);
        }
    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

testWebhook();
