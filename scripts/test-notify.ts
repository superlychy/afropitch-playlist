
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://gildytqinnntmtvbagxm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDIzOTEsImV4cCI6MjA4MjI3ODM5MX0.9x7utKiltdD8zzwWWi_8D2PTW0Y17Pi9dHQ5eTnX7fg'

console.log("Testing Notify User Function...");

async function testFunction() {
    console.log("Testing Broadcast Notification...");
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
            schema: 'public',
            table: 'broadcasts',
            type: 'INSERT',
            record: {
                id: 'test-broadcast-123',
                subject: 'Test Broadcast {{name}}',
                message: 'Hello {{name}}, this is a test broadcast.',
                sender_id: 'test-admin',
                channel: 'email',
                target_role: 'artist', // or 'all'
                created_at: new Date().toISOString()
            },
            old_record: null
        })
    });

    const data = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", data);
}

testFunction();
