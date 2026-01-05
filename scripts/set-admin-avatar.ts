import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function setAdminAvatar() {
    // Update the user with role 'admin' (cabat) to have the logo
    const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: '/logo.png' })
        .eq('role', 'admin')
        .select();

    if (error) {
        console.error("Error updating admin avatar:", error);
    } else {
        console.log("Updated Admin Avatar:", data);
    }
}

setAdminAvatar();
