import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function findAdmin() {
    const { data: curators, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .or('role.eq.curator,role.eq.admin');

    if (error) {
        console.error(error);
        return;
    }

    console.log("Found Profiles:");
    curators.forEach(c => {
        console.log(`- [${c.role}] ${c.full_name} (${c.email}) - Avatar: ${c.avatar_url}`);
    });
}

findAdmin();
