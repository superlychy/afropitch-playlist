-- Add tracking columns to submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS tracking_slug text,
ADD COLUMN IF NOT EXISTS clicks int default 0;

-- Optional: Create an index for faster lookups on tracking_slug
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_slug ON public.submissions(tracking_slug);
