const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local to get keys
const envPath = path.resolve(__dirname, '..', '.env.local');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/); // Try to find service key
    // Usually user only has anon key locally unless they added service key.
    // If we only have anon key, we can't create admin reliably unless RLS allows it (it shouldn't).

    // For this environment, we might need to rely on the user adding the key.
    // But let's check if the previous 'type' command output showed it. 
    // It showed NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_PAYSTACK_KEY. It did NOT show SERVICE_ROLE_KEY.

    if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
}

console.log("Supabase URL:", SUPABASE_URL);

// NOTE: Since we likely don't have the SERVICE_ROLE_KEY in .env.local, we can't fully automate 
// the admin role creation from a script without the user providing the key.
// However, we can generate the SQL for them to run.

const SQL_MIGRATION = fs.readFileSync(path.resolve(__dirname, '..', 'supabase/migrations/20251226_add_support.sql'), 'utf8');

console.log("\n\n=== INSTRUCTIONS ===");
console.log("1. To apply the DB changes, copy the content of 'supabase/migrations/20251226_add_support.sql' and run it in your Supabase SQL Editor.");
console.log("2. To create the admin user:");
console.log("   - Go to Authentication > Users in Supabase Dashboard.");
console.log("   - Add User: email='admin@afropitch.com', password='Godisthegreatest01!'");
console.log("   - Confirm the user (auto-confirm if possible).");
console.log("   - Go to SQL Editor and run:");
console.log(`
update public.profiles 
set role = 'admin' 
where email = 'admin@afropitch.com';
`);

// We will creating a temporary file for them to copy if they want.
