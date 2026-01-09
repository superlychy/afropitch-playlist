-- Create Analytics Table
CREATE TABLE IF NOT EXISTS public.analytics_visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL, -- Generated on client side per session
    ip_address text,
    user_agent text,
    country text,
    path text, -- Entry path
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    page_views int DEFAULT 1,
    clicks int DEFAULT 0
);

-- Index for fast "Online Users" count
CREATE INDEX IF NOT EXISTS analytics_last_seen_idx ON public.analytics_visits (last_seen_at);
CREATE INDEX IF NOT EXISTS analytics_session_idx ON public.analytics_visits (session_id);

-- RLS
ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;

-- Allow Anon/Auth to INSERT (Tracking)
CREATE POLICY "Allow public insert analytics" ON public.analytics_visits FOR INSERT WITH CHECK (true);

-- Allow Anon/Auth to UPDATE (Heartbeat/Clicks for own session)
-- Note: This is tricky with IP/Session. Simplest is to allow update if you know the UUID (session_id not distinct enough, use ID).
-- But for security, usually Analytics is 'Write Only' for public, 'Read Only' for Admin.
-- Better approach: Data ingestion via standard Service Role API (Edge Function or Next.js API).
-- IF we use RLS, we need to be careful.
-- Let's stick to Service Role (Next.js API) for writing to avoid exposing this table to public client directly.
-- So:
-- Policy: Service Role (Full Access)
-- Policy: Admin (View)

CREATE POLICY "Admins can view analytics" ON public.analytics_visits FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- We won't allow public direct access via supabase-js client to prevent tampering.
-- We will use the Next.js API route with Service Role to write.
