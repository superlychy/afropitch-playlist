-- 1. Ensure tracking columns exist in submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS tracking_slug text,
ADD COLUMN IF NOT EXISTS clicks int default 0;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_slug ON public.submissions(tracking_slug);

-- 3. Force PostgREST to reload schema cache (Fixes "schema cache" errors)
NOTIFY pgrst, 'reload schema';
