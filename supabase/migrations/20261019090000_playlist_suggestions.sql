-- Playlist suggestion on decline (2026-10-19, Max approved spec)
--
-- When a curator/admin declines with the "suggest_playlist" reason, they pick
-- another playlist (same tier or cheaper). The fee is refunded to the artist's
-- wallet at that moment (existing refund logic). The artist can then Accept the
-- suggestion from the decline email or dashboard, which auto-resubmits the song
-- to the suggested playlist, spending the wallet credit.
--
-- New columns on submissions:
--   suggested_playlist_id uuid  -> the playlist the curator suggested
--   suggested_by uuid           -> curator/admin who made the suggestion
--   suggestion_status text      -> 'pending' | 'accepted' (no deadline, stays pending)
--   suggestion_round integer    -> 0 for original submissions; each resubmission
--                                  is parent round + 1. Max 3 rounds.
--   origin_submission_id uuid   -> parent submission in the suggestion chain
--
-- Changes:
--   1. process_submission_review gains an 8th arg p_suggested_playlist_id
--      (same drop-and-recreate pattern as the quick_decline migration).
--      Server-enforced: suggestion only on a real decline, only by the
--      reviewing curator/admin, suggested playlist must be active and cost
--      no more than the original fee, and the row must be below round 3.
--   2. New RPC accept_playlist_suggestion(p_submission_id) for the artist:
--      validates the pending suggestion, checks wallet credit, creates the
--      resubmission row, marks the suggestion consumed.

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS suggested_playlist_id uuid REFERENCES public.playlists(id),
ADD COLUMN IF NOT EXISTS suggested_by uuid,
ADD COLUMN IF NOT EXISTS suggestion_status text,
ADD COLUMN IF NOT EXISTS suggestion_round integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS origin_submission_id uuid REFERENCES public.submissions(id);

COMMENT ON COLUMN public.submissions.suggested_playlist_id IS
    'Playlist a curator/admin suggested when declining with the suggest_playlist reason. Same tier or cheaper than the original submission.';
COMMENT ON COLUMN public.submissions.suggested_by IS
    'Curator/admin (profiles.id) who made the playlist suggestion.';
COMMENT ON COLUMN public.submissions.suggestion_status IS
    'pending = artist has not accepted yet (no deadline); accepted = artist accepted and a resubmission row was created.';
COMMENT ON COLUMN public.submissions.suggestion_round IS
    '0 for original submissions; each accepted suggestion creates a row with parent round + 1. Declines may only suggest while this is below 3.';
COMMENT ON COLUMN public.submissions.origin_submission_id IS
    'Parent submission this row was resubmitted from via an accepted playlist suggestion.';

-- 8-arg signature: drop the 7-arg version first (same pattern as before).
DROP FUNCTION IF EXISTS public.process_submission_review(uuid, text, text, uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION public.process_submission_review(
    p_submission_id uuid,
    p_action text,
    p_feedback text,
    p_curator_id uuid,
    p_tracking_slug text DEFAULT NULL,
    p_decline_reason text DEFAULT NULL,
    p_silent boolean DEFAULT false,
    p_suggested_playlist_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_submission record;
    v_artist_id uuid;
    v_amount numeric;
    v_playlist_curator_id uuid;
    v_curator_is_admin boolean;
    v_curator_share numeric;
    v_caller_role text;
    v_suggested_fee numeric;
    v_suggested_active boolean;
BEGIN
    SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    SELECT curator_id INTO v_playlist_curator_id FROM public.playlists WHERE id = v_submission.playlist_id;

    -- Auth check: only the playlist's curator or an admin may review
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_playlist_curator_id IS DISTINCT FROM auth.uid() AND COALESCE(v_caller_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: You are not the curator');
    END IF;

    v_artist_id := v_submission.artist_id;
    v_amount := COALESCE(v_submission.amount_paid, 0);

    -- Hide / unhide: reversible queue flag, never a decision.
    IF p_action = 'archived' THEN
        IF v_submission.status != 'pending' THEN
            RETURN json_build_object('success', false, 'message', 'Only pending submissions can be hidden');
        END IF;
        UPDATE public.submissions
        SET is_archived = true, updated_at = now()
        WHERE id = p_submission_id;
        RETURN json_build_object('success', true, 'hidden', true);
    END IF;

    IF p_action = 'unarchived' THEN
        IF NOT COALESCE(v_submission.is_archived, false) THEN
            RETURN json_build_object('success', false, 'message', 'Submission is not hidden');
        END IF;
        UPDATE public.submissions
        SET is_archived = false, updated_at = now()
        WHERE id = p_submission_id;
        RETURN json_build_object('success', true, 'hidden', false);
    END IF;

    -- Only process pending submissions for decision actions
    IF v_submission.status != 'pending' THEN
        RETURN json_build_object('success', false, 'message', 'Submission already reviewed');
    END IF;

    -- GUARD: a silent decline is only ever allowed for a FREE submission and
    -- only by an admin. A silent decline can never carry a suggestion.
    IF p_silent IS TRUE AND (v_amount > 0 OR COALESCE(v_caller_role, '') != 'admin') THEN
        RETURN json_build_object('success', false, 'message', 'Silent decline is only allowed for free submissions by admins');
    END IF;

    IF p_silent IS TRUE AND p_action != 'declined' THEN
        RETURN json_build_object('success', false, 'message', 'Silent mode is only valid with the declined action');
    END IF;

    IF p_suggested_playlist_id IS NOT NULL THEN
        -- A suggestion is only valid on a real, non-silent decline.
        IF p_action NOT IN ('declined', 'rejected') THEN
            RETURN json_build_object('success', false, 'message', 'A playlist suggestion is only valid with a decline');
        END IF;
        IF p_silent IS TRUE THEN
            RETURN json_build_object('success', false, 'message', 'A silent decline cannot suggest a playlist');
        END IF;
        -- Max 3 rounds: a round-3 submission can be declined, but not suggested onward.
        IF COALESCE(v_submission.suggestion_round, 0) >= 3 THEN
            RETURN json_build_object('success', false, 'message', 'This song has used all 3 suggestion rounds');
        END IF;
        -- The suggested playlist must exist, be active, and cost no more than
        -- the original submission (same tier or cheaper).
        SELECT submission_fee, is_active INTO v_suggested_fee, v_suggested_active
        FROM public.playlists WHERE id = p_suggested_playlist_id;
        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'message', 'Suggested playlist not found');
        END IF;
        IF NOT COALESCE(v_suggested_active, false) THEN
            RETURN json_build_object('success', false, 'message', 'The suggested playlist is not active');
        END IF;
        IF COALESCE(v_suggested_fee, 0) > v_amount THEN
            RETURN json_build_object('success', false, 'message', 'The suggested playlist costs more than the original submission');
        END IF;
        IF p_suggested_playlist_id = v_submission.playlist_id THEN
            RETURN json_build_object('success', false, 'message', 'Cannot suggest the same playlist');
        END IF;
    END IF;

    IF p_silent IS TRUE THEN
        -- Quick decline: no reason, no feedback, no email (notify-user skips
        -- decline_silent rows). Amount is 0 by the guard above, so no refund.
        UPDATE public.submissions
        SET status = 'declined',
            feedback = NULL,
            decline_reason = NULL,
            decline_silent = true,
            is_archived = false,
            updated_at = now()
        WHERE id = p_submission_id;
        RETURN json_build_object('success', true, 'silent', true);
    END IF;

    UPDATE public.submissions
    SET status = p_action,
        feedback = p_feedback,
        updated_at = now(),
        decline_reason = CASE WHEN p_action IN ('declined', 'rejected') THEN p_decline_reason ELSE decline_reason END,
        tracking_slug = CASE WHEN p_action = 'accepted' THEN p_tracking_slug ELSE tracking_slug END,
        suggested_playlist_id = CASE WHEN p_action IN ('declined', 'rejected') AND p_suggested_playlist_id IS NOT NULL THEN p_suggested_playlist_id ELSE suggested_playlist_id END,
        suggested_by = CASE WHEN p_action IN ('declined', 'rejected') AND p_suggested_playlist_id IS NOT NULL THEN auth.uid() ELSE suggested_by END,
        suggestion_status = CASE WHEN p_action IN ('declined', 'rejected') AND p_suggested_playlist_id IS NOT NULL THEN 'pending' ELSE suggestion_status END
    WHERE id = p_submission_id;

    IF p_action IN ('declined', 'rejected') THEN
        -- Full refund to artist: spend-only credit, not withdrawable. For a
        -- decline with a suggestion this is the held fund the artist spends
        -- when they accept the suggestion.
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
                -- 70% to curator, 30% stays with the platform.
                -- Curator earnings are withdrawable.
                v_curator_share := v_amount * 0.70;
                UPDATE public.profiles
                SET balance = balance + v_curator_share,
                    withdrawable_balance = withdrawable_balance + v_curator_share
                WHERE id = v_playlist_curator_id;
                INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
                VALUES (v_playlist_curator_id, v_curator_share, 'Earning (70%): ' || v_submission.song_title, p_submission_id);
            END IF;
            -- Admin-owned playlists: platform keeps 100% (no curator payout row)
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- The artist accepts a pending playlist suggestion. Creates the resubmission
-- row (same song, same tier, new playlist) and spends the wallet credit
-- (profiles.balance, where the decline refund landed).
CREATE OR REPLACE FUNCTION public.accept_playlist_suggestion(p_submission_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent record;
    v_playlist record;
    v_artist_id uuid;
    v_fee numeric;
    v_balance numeric;
    v_new_id uuid;
BEGIN
    SELECT * INTO v_parent FROM public.submissions WHERE id = p_submission_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Submission not found');
    END IF;

    v_artist_id := auth.uid();
    IF v_parent.artist_id IS DISTINCT FROM v_artist_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: this suggestion is not yours');
    END IF;

    IF v_parent.status != 'declined' OR COALESCE(v_parent.suggestion_status, '') != 'pending' THEN
        RETURN json_build_object('success', false, 'message', 'There is no pending suggestion on this submission');
    END IF;

    IF v_parent.suggested_playlist_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'No suggested playlist on this submission');
    END IF;

    SELECT * INTO v_playlist FROM public.playlists WHERE id = v_parent.suggested_playlist_id;
    IF NOT FOUND OR NOT COALESCE(v_playlist.is_active, false) THEN
        RETURN json_build_object('success', false, 'message', 'The suggested playlist is no longer available');
    END IF;

    v_fee := COALESCE(v_playlist.submission_fee, 0);

    -- Same tier or cheaper only (the picker enforces this too; re-checked here).
    IF v_fee > COALESCE(v_parent.amount_paid, 0) THEN
        RETURN json_build_object('success', false, 'message', 'The suggested playlist costs more than your original submission');
    END IF;

    SELECT balance INTO v_balance FROM public.profiles WHERE id = v_artist_id FOR UPDATE;
    IF COALESCE(v_balance, 0) < v_fee THEN
        RETURN json_build_object('success', false, 'message', 'Not enough wallet credit for this resubmission. Top up your wallet and try again.');
    END IF;

    -- Spend the wallet credit (always from balance, where the decline refund landed).
    IF v_fee > 0 THEN
        UPDATE public.profiles SET balance = balance - v_fee WHERE id = v_artist_id;
    END IF;

    -- The resubmission: same song, same tier, new playlist. Carries the
    -- platform links so the new curator gets the full picture.
    INSERT INTO public.submissions (
        artist_id, playlist_id, song_title, artist_name, song_link, tier,
        amount_paid, status,
        apple_music_url, audiomack_url, boomplay_url,
        cover_art_url, deezer_url, youtube_music_url,
        suggestion_round, origin_submission_id
    )
    VALUES (
        v_parent.artist_id, v_playlist.id, v_parent.song_title, v_parent.artist_name, v_parent.song_link, v_parent.tier,
        v_fee, 'pending',
        v_parent.apple_music_url, v_parent.audiomack_url, v_parent.boomplay_url,
        v_parent.cover_art_url, v_parent.deezer_url, v_parent.youtube_music_url,
        COALESCE(v_parent.suggestion_round, 0) + 1, v_parent.id
    )
    RETURNING id INTO v_new_id;

    IF v_fee > 0 THEN
        INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
        VALUES (v_artist_id, -v_fee, 'submission', 'Resubmission (suggested): ' || v_parent.song_title, v_new_id);
    END IF;

    -- The suggestion is consumed: no double-accepts, no second resubmission.
    UPDATE public.submissions
    SET suggestion_status = 'accepted', updated_at = now()
    WHERE id = p_submission_id;

    RETURN json_build_object('success', true, 'submission_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_submission_review(uuid, text, text, uuid, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_playlist_suggestion(uuid) TO authenticated;
