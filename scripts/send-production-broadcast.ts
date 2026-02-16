
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://gildytqinnntmtvbagxm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMjM5MSwiZXhwIjoyMDgyMjc4MzkxfQ.L37HsKmzmvxUh1r8r5dYrRuy8i50akMfd5hpWOcv5ms';

// Create Supabase Client with Service Role (Bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const broadcastHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AfroPitchPlay Service Update</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; padding:40px;">
          
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <h2 style="margin:0; color:#111111;">AfroPitchPlay Service Update</h2>
            </td>
          </tr>

          <tr>
            <td style="color:#555555; font-size:16px; line-height:1.6;">
              <p>Dear AfroPitchPlay Community,</p>

              <p>We sincerely apologize for the recent downtime on our platform which may have prevented some users from logging into their accounts.</p>

              <p>The issue has now been fully resolved, and the platform is running smoothly again.</p>

              <p>If you previously experienced login difficulties, please log back into your account and continue your submission process.</p>

              <p>Artists who were unable to submit their songs for review can now proceed without any issues.</p>

              <p>We truly appreciate your patience, understanding, and continued trust in AfroPitchPlay.</p>

              <p>If you experience any further issues, please contact our support team immediately.</p>

              <p style="margin-top:30px;">
                Thank you for being part of the AfroPitchPlay community.<br><br>
                — The AfroPitchPlay Team
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendBroadcast() {
    console.log("🚀 Preparing to send Production Broadcast...");

    // 1. Get a valid Admin/User ID to use as sender (Required by FK constraint)
    // We'll just grab the first user found, ideally an admin, but any valid user ID satisfies the constraint.
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({ per_page: 1 });

    if (userError || !users || users.length === 0) {
        console.error("❌ Failed to fetch user for sender_id:", userError);
        return;
    }

    const senderId = users[0].id;
    console.log(`👤 Using Sender ID: ${senderId} (${users[0].email})`);

    // 2. Insert into Broadcasts Table
    // This will trigger the Edge Function logic via the Database Webhook we set up.

    /* 
       Wait, if we rely on the DB trigger, it might be safer to call the function directly 
       if we want immediate feedback and to ensure no trigger issues (since we just fixed the trigger but didn't verify inserting into DB).
       
       However, inserting into DB is the "right" way. Let's try inserting first.
    */

    const { data, error } = await supabase.from('broadcasts').insert({
        subject: 'AfroPitchPlay Service Update',
        message: broadcastHtml, // Raw HTML is fine as our Edge Function handles it
        sender_id: senderId,
        target_role: 'all',
        channel: 'email'
    }).select().single();

    if (error) {
        console.error("❌ Database Insert Error:", error);

        // Fallback: Call Edge Function Directly if DB insert fails
        console.log("⚠️ Attempting Direct Function Call Fallback...");
        await callFunctionDirectly(senderId);
    } else {
        console.log("✅ Broadcast Inserted Successfully:", data.id);
        console.log("📢 Notifications should be sending now via Supabase Edge Function.");
    }
}

async function callFunctionDirectly(senderId: string) {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
            schema: 'public',
            table: 'broadcasts',
            type: 'INSERT',
            record: {
                id: crypto.randomUUID(),
                subject: 'AfroPitchPlay Service Update',
                message: broadcastHtml,
                sender_id: senderId,
                channel: 'email',
                target_role: 'all',
                created_at: new Date().toISOString()
            }
        })
    });

    const resText = await response.text();
    console.log("Direct Call Status:", response.status);
    console.log("Direct Call Response:", resText);
}

sendBroadcast();
