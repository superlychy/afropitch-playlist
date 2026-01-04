
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://gildytqinnntmtvbagxm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDIzOTEsImV4cCI6MjA4MjI3ODM5MX0.9x7utKiltdD8zzwWWi_8D2PTW0Y17Pi9dHQ5eTnX7fg'

console.log("Testing Notify User Function...");

async function testFunction() {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
            schema: 'public',
            table: 'transactions',
            type: 'INSERT',
            record: {
                id: 'test-transaction-123',
                user_id: 'test-user',
                amount: 5000,
                type: 'deposit',
                description: 'Test Deposit',
                created_at: new Date().toISOString()
            }
        })
    });

    const data = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", data);
}

testFunction();
