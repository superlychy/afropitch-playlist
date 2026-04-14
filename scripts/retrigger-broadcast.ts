
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gildytqinnntmtvbagxm.supabase.co'
const supabaseKey = 'YOUR_SUPABASE_KEY'

// The ID from the previous successful insert
const BROADCAST_ID = 'd210dbdb-cd6d-476f-b0e2-6bad4d4f04fe';

async function retriggerBroadcast() {
    console.log("Triggering Broadcast Notification Manually...");

    // 1. Fetch the broadcast details first
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: record, error } = await supabase.from('broadcasts').select('*').eq('id', BROADCAST_ID).single();

    if (error || !record) {
        console.error("Broadcast not found:", error);
        return;
    }

    console.log("Found Broadcast:", record.subject);

    // 2. Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}` // Using Service Role Key here ensures access
        },
        body: JSON.stringify({
            schema: 'public',
            table: 'broadcasts',
            type: 'INSERT',
            record: record,
            old_record: null
        })
    });

    const data = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", data);
}

retriggerBroadcast();
