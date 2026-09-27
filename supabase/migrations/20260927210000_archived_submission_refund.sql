-- Archived submissions now refund the artist (previously the payment was stranded:
-- the curator dashboard archived via direct UPDATE, bypassing the RPC's money logic).
-- Archived = dismissed without placement, so the artist gets a full refund and the
-- curator gets no earning.

CREATE OR REPLACE FUNCTION public.process_submission_review(p_submission_id uuid, p_action text, p_feedback text, p_curator_id uuid, p_tracking_slug text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_submission record;
    v_artist_id uuid;
    v_amount numeric;
    v_playlist_curator_id uuid;
    v_curator_is_admin boolean;
    v_curator_share numeric;
    v_caller_role text;
BEGIN
    SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    -- Only process pending submissions
    IF v_submission.status != 'pending' THEN
        RETURN json_build_object('success', false, 'message', 'Submission already reviewed');
    END IF;

    SELECT curator_id INTO v_playlist_curator_id FROM public.playlists WHERE id = v_submission.playlist_id;

    -- Auth check: only the playlist's curator or an admin may review
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_playlist_curator_id IS DISTINCT FROM auth.uid() AND COALESCE(v_caller_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: You are not the curator');
    END IF;

    UPDATE public.submissions
    SET status = p_action,
        feedback = p_feedback,
        updated_at = now(),
        tracking_slug = CASE WHEN p_action = 'accepted' THEN p_tracking_slug ELSE tracking_slug END
    WHERE id = p_submission_id;

    v_artist_id := v_submission.artist_id;
    v_amount := v_submission.amount_paid;

    IF p_action IN ('declined', 'rejected', 'archived') THEN
        -- Full refund to artist (archived = dismissed without placement)
        IF v_amount > 0 THEN
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
            VALUES (v_artist_id, v_amount, 'refund', 'Refund: ' || v_submission.song_title, p_submission_id);
        END IF;

    ELSIF p_action IN ('accepted', 'approved') THEN
        IF v_amount > 0 THEN
            SELECT (role = 'admin') INTO v_curator_is_admin
            FROM public.profiles WHERE id = v_playlist_curator_id;

            IF NOT COALESCE(v_curator_is_admin, false) THEN
                -- 70% to curator, 30% stays with the platform
                v_curator_share := v_amount * 0.70;
                UPDATE public.profiles SET balance = balance + v_curator_share WHERE id = v_playlist_curator_id;
                INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
                VALUES (v_playlist_curator_id, v_curator_share, 'earning', 'Earning (70%): ' || v_submission.song_title, p_submission_id);
            END IF;
            -- Admin-owned playlists: platform keeps 100% (no curator payout row)
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;
