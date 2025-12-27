-- 1. Migrate existing data to match new types BEFORE adding constraint
-- Assumption: 'regular' should become 'standard' (or 'free' if you prefer, but standard is safer mapping)
UPDATE public.playlists 
SET type = 'standard' 
WHERE type = 'regular';

-- 2. Drop the existing check constraint
ALTER TABLE public.playlists 
DROP CONSTRAINT IF EXISTS playlists_type_check;

-- 3. Add new check constraint
ALTER TABLE public.playlists 
ADD CONSTRAINT playlists_type_check 
CHECK (type IN ('free', 'standard', 'exclusive'));

-- 4. Set default
ALTER TABLE public.playlists 
ALTER COLUMN type SET DEFAULT 'free';

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
