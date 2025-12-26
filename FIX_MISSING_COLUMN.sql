-- Run this in your Supabase SQL Editor to fix the "missing column" error

ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS playlist_link text;

-- Reload the schema cache to ensure the API sees the new column
NOTIFY pgrst, 'reload config';
