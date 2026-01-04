-- 1. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text CHECK (type IN ('payment', 'refund', 'earning', 'withdrawal', 'deposit')),
    description text,
    related_submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all transactions (assuming admin check uses a role or separate logic, 
-- but simpler RLS often relies on valid user check if admins are just users with a flag)
-- We'll add a generic admin policy if needed, or rely on Service Role for Admin Dashboard.
-- For safety, let's allow users to insert their own transactions (for payments) 
-- OR strictly control inserts via RPC. Let's start with RPCs for data integrity.

-- 2. Function to Process Submission Reviews (Securely handles Refunds/Earnings)
CREATE OR REPLACE FUNCTION public.process_submission_review(
    p_submission_id uuid,
    p_action text, -- 'accepted' or 'declined'
    p_feedback text,
    p_curator_id uuid -- passed from client to verify ownership/permission logic or just use auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (admin), bypassing RLS
AS $$
DECLARE
    v_submission record;
    v_artist_id uuid;
    v_amount numeric;
    v_playlist_curator_id uuid;
BEGIN
    -- Get Submission Info
    SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    -- Verify the caller is the curator of the playlist
    SELECT curator_id INTO v_playlist_curator_id FROM public.playlists WHERE id = v_submission.playlist_id;
    
    -- In a real secure app, check if auth.uid() == v_playlist_curator_id
    -- For now we trust the flow or simple check:
    IF v_playlist_curator_id != auth.uid() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
         RETURN json_build_object('success', false, 'message', 'Unauthorized: You are not the curator');
    END IF;

    v_artist_id := v_submission.artist_id;
    v_amount := v_submission.amount_paid;

    -- Update Submission Status
    UPDATE public.submissions 
    SET status = p_action, 
        feedback = p_feedback, 
        updated_at = now()
    WHERE id = p_submission_id;

    -- Handle Money & Transactions
    IF p_action = 'declined' THEN
        -- REFUND ARTIST
        IF v_amount > 0 THEN
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
            
            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_artist_id, v_amount, 'refund', 'Refund for declined submission: ' || v_submission.song_title, p_submission_id);
        END IF;

    ELSIF p_action = 'accepted' THEN
        -- PAY CURATOR
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

-- 3. Function to Pay for Submission (Safe Transaction Log)
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
