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
    v_curator_share numeric;
BEGIN
    SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    SELECT curator_id INTO v_playlist_curator_id FROM public.playlists WHERE id = v_submission.playlist_id;
    
    -- Auth Check
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
            -- Full Refund to Artist
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
            
            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_artist_id, v_amount, 'refund', 'Refund for declined submission: ' || v_submission.song_title, p_submission_id);
        END IF;

    ELSIF p_action = 'accepted' THEN
        IF v_amount > 0 THEN
            -- 70% Share to Curator
            v_curator_share := v_amount * 0.70;

            UPDATE public.profiles SET balance = balance + v_curator_share WHERE id = v_playlist_curator_id;

            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_playlist_curator_id, v_curator_share, 'earning', 'Earning (70%) from accepted submission: ' || v_submission.song_title, p_submission_id);
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
