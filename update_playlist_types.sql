-- Drop the existing check constraint
ALTER TABLE public.playlists 
DROP CONSTRAINT IF EXISTS playlists_type_check;

-- Add new check constraint supporting 'free', 'standard', 'exclusive'
ALTER TABLE public.playlists 
ADD CONSTRAINT playlists_type_check 
CHECK (type IN ('free', 'standard', 'exclusive'));

-- Set default to 'free'
ALTER TABLE public.playlists 
ALTER COLUMN type SET DEFAULT 'free';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
