import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    try {
        // Log environment status (safely)
        console.log('Admin Impersonate called. Service Key present:', !!supabaseServiceKey);

        if (!supabaseServiceKey || supabaseServiceKey.length < 20) {
            console.error('Missing or invalid SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server configuration error: Missing Service Key' }, { status: 500 });
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        console.log(`Generating impersonation link for user ID: ${userId}`);

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

        if (userError || !userData || !userData.user) {
            console.error('User lookup failed:', userError);
            // Try fetching from public profiles as fallback to verify ID exists
            const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();
            if (profile) {
                console.log('Found user in profiles, but auth lookup failed. Likely auth user deleted or ID mismatch.');
                return NextResponse.json({ error: `User auth record not found for ${profile.email}` }, { status: 404 });
            }
            return NextResponse.json({ error: 'User not found in Auth system' }, { status: 404 });
        }

        const email = userData.user.email;
        if (!email) {
            return NextResponse.json({ error: 'User has no email' }, { status: 400 });
        }
        console.log(`Found user email: ${email}`);

        // Generate Magic Link
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email
        });

        if (error) {
            console.error('Error generating link:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { properties } = data;
        if (!properties || !properties.action_link) {
            return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
        }

        console.log('Link generated successfully');

        return NextResponse.json({
            action_link: properties.action_link,
            email: email
        });

    } catch (error: any) {
        console.error('Impersonate error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
