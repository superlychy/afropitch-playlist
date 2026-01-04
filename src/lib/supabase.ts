import { createBrowserClient } from '@supabase/ssr'

// Safe fallback for build time. Runtime will fail if not set in Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
