-- 1. Add 'read' column to support_messages to track unread status
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2. Add 'ranking_boosted_at' to submissions to track rank boosts
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ranking_boosted_at timestamp with time zone;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
