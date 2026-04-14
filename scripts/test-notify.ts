
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://gildytqinnntmtvbagxm.supabase.co'
const supabaseKey = 'YOUR_SUPABASE_KEY'

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
