-- 1. DROP the existing constraint FIRST so we can change the data to new values
ALTER TABLE public.playlists 
DROP CONSTRAINT IF EXISTS playlists_type_check;

-- 2. NOW we can safely update 'regular' to 'standard' (or clean up other values)
UPDATE public.playlists 
SET type = 'standard' 
WHERE type = 'regular';

-- Optional: Ensure no other invalid values exist, default to 'free' if necessary
-- UPDATE public.playlists SET type = 'free' WHERE type NOT IN ('standard', 'exclusive');

-- 3. Add the new constraint
ALTER TABLE public.playlists 
ADD CONSTRAINT playlists_type_check 
CHECK (type IN ('free', 'standard', 'exclusive'));

-- 4. Set the default value
ALTER TABLE public.playlists 
ALTER COLUMN type SET DEFAULT 'free';

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
