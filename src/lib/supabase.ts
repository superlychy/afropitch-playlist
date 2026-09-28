import { createBrowserClient } from '@supabase/ssr'

// Safe fallback for build time. Runtime will fail if not set in Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Session-independent client for PUBLIC reads (playlist/curator listings, etc).
 * Never touches the stored login session, so a stale/broken session in one
 * tab can never break public page loads. Always queries as anonymous, which
 * is all public listings need.
 */
export const supabasePublic = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});
