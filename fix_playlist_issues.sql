-- 1. Fix Schema: Allow 'express' type and set default
ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_type_check;
ALTER TABLE public.playlists ADD CONSTRAINT playlists_type_check CHECK (type IN ('free', 'standard', 'express', 'exclusive'));
ALTER TABLE public.playlists ALTER COLUMN type SET DEFAULT 'free';

-- 2. Fix Schema: Add Cascase Deletes
ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_curator_id_fkey;
ALTER TABLE public.playlists 
    ADD CONSTRAINT playlists_curator_id_fkey 
    FOREIGN KEY (curator_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_playlist_id_fkey;
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_playlist_id_fkey 
    FOREIGN KEY (playlist_id) 
    REFERENCES public.playlists(id) 
    ON DELETE CASCADE;

ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_artist_id_fkey;
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_artist_id_fkey 
    FOREIGN KEY (artist_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE public.withdrawals 
    ADD CONSTRAINT withdrawals_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 3. Fix Data: Update "Best of 2025" and "African HipHop" to Standard and add Links
UPDATE public.playlists 
SET type = 'standard', 
    playlist_link = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', -- Generic Link for testing
    submission_fee = 3000
WHERE name ILIKE '%Best of 2025%' OR name ILIKE '%African HipHop%';

-- 4. Ensure Detroit/Noni playlist is consistent (optional)
UPDATE public.playlists 
SET type = 'standard',
    submission_fee = 3000
WHERE name ILIKE '%Detroit Br%' AND (type IS NULL OR type = 'free');

NOTIFY pgrst, 'reload schema';
