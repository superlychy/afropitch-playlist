-- 1. Update Playlists Type Check
ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_type_check;
ALTER TABLE public.playlists ADD CONSTRAINT playlists_type_check CHECK (type IN ('free', 'standard', 'express', 'exclusive'));
ALTER TABLE public.playlists ALTER COLUMN type SET DEFAULT 'free';

-- 2. Update Foreign Keys to CASCADE

-- Playlists -> Curator
ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_curator_id_fkey;
ALTER TABLE public.playlists 
    ADD CONSTRAINT playlists_curator_id_fkey 
    FOREIGN KEY (curator_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Submissions -> Playlist
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_playlist_id_fkey;
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_playlist_id_fkey 
    FOREIGN KEY (playlist_id) 
    REFERENCES public.playlists(id) 
    ON DELETE CASCADE;

-- Submissions -> Artist
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_artist_id_fkey;
ALTER TABLE public.submissions 
    ADD CONSTRAINT submissions_artist_id_fkey 
    FOREIGN KEY (artist_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Withdrawals -> User
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE public.withdrawals 
    ADD CONSTRAINT withdrawals_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Support Tickets -> User
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE public.support_tickets 
    ADD CONSTRAINT support_tickets_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Support Messages -> Ticket (Already CASCADE usually, but ensuring)
ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_ticket_id_fkey;
ALTER TABLE public.support_messages 
    ADD CONSTRAINT support_messages_ticket_id_fkey 
    FOREIGN KEY (ticket_id) 
    REFERENCES public.support_tickets(id) 
    ON DELETE CASCADE;

-- Notify
NOTIFY pgrst, 'reload schema';
