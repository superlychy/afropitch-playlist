-- Add duration_seconds column for better time tracking
ALTER TABLE public.analytics_visits 
ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;
