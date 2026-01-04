-- 1. Fix Missing Playlist Column
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS playlist_link text;

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text CHECK (type IN ('payment', 'refund', 'earning', 'withdrawal', 'deposit')),
    description text,
    related_submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can view own transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" ON public.transactions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Functions
-- process_submission_review
CREATE OR REPLACE FUNCTION public.process_submission_review(
    p_submission_id uuid,
    p_action text, -- 'accepted' or 'declined'
    p_feedback text,
    p_curator_id uuid,
    p_tracking_slug text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission record;
    v_artist_id uuid;
    v_amount numeric;
    v_playlist_curator_id uuid;
BEGIN
    SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    SELECT curator_id INTO v_playlist_curator_id FROM public.playlists WHERE id = v_submission.playlist_id;
    
    IF v_playlist_curator_id != auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
         RETURN json_build_object('success', false, 'message', 'Unauthorized: You are not the curator');
    END IF;

    v_artist_id := v_submission.artist_id;
    v_amount := v_submission.amount_paid;

    UPDATE public.submissions 
    SET status = p_action, 
        feedback = p_feedback, 
        tracking_slug = COALESCE(p_tracking_slug, tracking_slug),
        updated_at = now()
    WHERE id = p_submission_id;

    IF p_action = 'declined' THEN
        IF v_amount > 0 THEN
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
            
            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_artist_id, v_amount, 'refund', 'Refund for declined submission: ' || v_submission.song_title, p_submission_id);
        END IF;

    ELSIF p_action = 'accepted' THEN
        IF v_amount > 0 THEN
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_playlist_curator_id;

            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_playlist_curator_id, v_amount, 'earning', 'Earning from accepted submission: ' || v_submission.song_title, p_submission_id);
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- pay_for_submission
CREATE OR REPLACE FUNCTION public.pay_for_submission(
    p_user_id uuid,
    p_amount numeric,
    p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;

    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;
    
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_amount, 'payment', p_description);

    RETURN true;
END;
$$;

-- 4. Playlist Policies (from update_playlist_policies.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'playlists' 
        AND policyname = 'Curators can delete own playlists'
    ) THEN
        CREATE POLICY "Curators can delete own playlists" ON public.playlists FOR DELETE USING (auth.uid() = curator_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'playlists' 
        AND policyname = 'Admins can insert playlists'
    ) THEN
        CREATE POLICY "Admins can insert playlists" ON public.playlists FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'playlists' 
        AND policyname = 'Admins can update any playlists'
    ) THEN
         CREATE POLICY "Admins can update any playlists" ON public.playlists FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

     IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'playlists' 
        AND policyname = 'Admins can delete any playlists'
    ) THEN
         CREATE POLICY "Admins can delete any playlists" ON public.playlists FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;


-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
