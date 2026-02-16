#!/usr/bin/env node

/**
 * Script to configure Supabase Edge Function secrets
 * This sets up the necessary environment variables for the notify-admin and notify-user functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

console.log('🔧 Configuring Supabase Edge Function Secrets...\n');

const secrets = [
    { name: 'ADMIN_WEBHOOK_URL', value: env.ADMIN_WEBHOOK_URL, description: 'Discord webhook for admin notifications' },
    { name: 'RESEND_API_KEY', value: env.RESEND_API_KEY, description: 'Resend API key for sending emails' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: env.SUPABASE_SERVICE_ROLE_KEY, description: 'Supabase service role key' },
    { name: 'SUPABASE_URL', value: env.NEXT_PUBLIC_SUPABASE_URL, description: 'Supabase project URL' },
    { name: 'SITE_URL', value: 'https://afropitchplay.best', description: 'Production site URL' },
];

let successCount = 0;
let failCount = 0;

secrets.forEach(({ name, value, description }) => {
    if (!value) {
        console.log(`⚠️  Skipping ${name} - not found in .env.local`);
        failCount++;
        return;
    }

    try {
        console.log(`Setting ${name}...`);
        console.log(`   Description: ${description}`);

        // Use npx supabase secrets set
        execSync(`npx supabase secrets set ${name}="${value}" --project-ref gildytqinnntmtvbagxm`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        console.log(`✅ ${name} set successfully\n`);
        successCount++;
    } catch (error) {
        console.error(`❌ Failed to set ${name}:`, error.message, '\n');
        failCount++;
    }
});

console.log('\n' + '='.repeat(50));
console.log(`Summary: ${successCount} successful, ${failCount} failed`);
console.log('='.repeat(50));

if (successCount > 0) {
    console.log('\n✨ Edge function secrets configured!');
    console.log('   The notify-admin and notify-user functions will now work correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Apply the database migration');
    console.log('   2. Test by logging in or creating a submission');
    console.log('   3. Check your Discord channel for notifications');
}

if (failCount > 0) {
    console.log('\n⚠️  Some secrets failed to set. Please check the errors above.');
    process.exit(1);
}
