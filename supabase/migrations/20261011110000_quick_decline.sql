-- Quick decline + archive-as-hide rework (2026-10-11, Max approved v1)
--
-- Problem: admins had no way to decline a FREE submission silently (no reason,
-- no email). The "archive" status was abused for that, but archive also
-- dismissed PAID submissions, creating a clash when a paying user deserved
-- feedback (and a refund) but got an archive instead.
--
-- New model:
--   1. "Quick decline": status='declined' + decline_silent=true, no reason,
--      no email. Server-enforced: ONLY for free submissions (amount_paid = 0)
--      AND only by admins. Paid submissions can never be silently declined.
--   2. "Archive" is no longer a dismissal. p_action='archived' only sets
--      is_archived=true (hides the row from the review queue); status stays
--      'pending', no money moves, no email. 'unarchived' clears the flag.
--   3. Existing status='archived' rows (all free, verified 2026-10-11) become
--      silent declines.

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS decline_silent boolean DEFAULT false;

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

COMMENT ON COLUMN public.submissions.decline_silent IS
    'True when an admin quick-declined a free submission: no reason asked, no email sent. notify-user skips the decline email for these rows.';
COMMENT ON COLUMN public.submissions.is_archived IS
    'Hide flag for the review queue. Archived rows stay pending and can be unhidden; archiving never decides, refunds, or emails.';

-- New 7-arg signature: drop the old 6-arg version first (same pattern as the
-- decline_reason migration). Existing callers keep working: p_silent defaults
-- to false.
DROP FUNCTION IF EXISTS public.process_submission_review(uuid, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.process_submission_review(
    p_submission_id uuid,
    p_action text,
    p_feedback text,
    p_curator_id uuid,
    p_tracking_slug text DEFAULT NULL,
    p_decline_reason text DEFAULT NULL,
    p_silent boolean DEFAULT false
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

    -- GUARD (the core of this rework): a silent decline is only ever allowed
    -- for a FREE submission and only by an admin. Paid submissions must always
    -- go through the reason + email flow, so the archive/paid/feedback glitch
    -- is impossible by construction.
    IF p_silent IS TRUE AND (v_amount > 0 OR COALESCE(v_caller_role, '') != 'admin') THEN
        RETURN json_build_object('success', false, 'message', 'Silent decline is only allowed for free submissions by admins');
    END IF;

    IF p_silent IS TRUE AND p_action != 'declined' THEN
        RETURN json_build_object('success', false, 'message', 'Silent mode is only valid with the declined action');
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
        tracking_slug = CASE WHEN p_action = 'accepted' THEN p_tracking_slug ELSE tracking_slug END
    WHERE id = p_submission_id;

    IF p_action IN ('declined', 'rejected') THEN
        -- Full refund to artist: spend-only credit, not withdrawable.
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

-- Data migration: the 33 legacy status='archived' rows (all amount_paid=0,
-- verified 2026-10-11) become silent declines. No retroactive emails.
UPDATE public.submissions
SET status = 'declined',
    decline_silent = true,
    is_archived = false,
    feedback = NULL,
    decline_reason = NULL
WHERE status = 'archived';
