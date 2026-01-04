-- Add missing columns to submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS ranking_boosted_at timestamp with time zone DEFAULT NULL;

-- Add updated_at to other tables just in case, good practice
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Initial backfill for updated_at if it was null (though default handles new ones, existing ones might be null if added without default, but here we set default)
UPDATE public.submissions SET updated_at = created_at WHERE updated_at IS NULL;
