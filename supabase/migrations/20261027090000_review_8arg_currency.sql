-- Fix the multi-currency review path: the app calls process_submission_review
-- with EIGHT parameters (decline_reason, silent, suggested_playlist_id), which
-- resolves to this older 8-arg overload — NOT the 5-arg version that migration
-- 20261026210000 replaced. Until now every review ran the pre-currency logic:
-- curator share = amount * 0.70 in the artist's denomination, and earning /
-- refund rows with no currency (read back as NGN). For NGN-only pairs that was
-- identical, so nothing broke; for foreign-currency pairs the curator would be
-- paid the wrong denomination and the rows would display as naira.
--
-- This replaces the 8-arg body with the currency-aware logic, preserving all
-- of its existing behaviour: archived/unarchived flags, silent-decline guards,
-- and the playlist-suggestion guards (max 3 rounds, active playlist, same
-- tier or cheaper, never the same playlist). The suggestion cost check now
-- compares the suggested playlist's TIER price in the artist's currency
-- against what the artist paid — for NGN artists that equals the old
-- submission_fee comparison (admin sets submission_fee from the tier prices),
-- and for foreign artists it is the price a resubmission would actually cost.
-- The 5-arg version is kept as a thin delegating wrapper so the two entry
-- points can never diverge again.

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
    v_suggested_type text;
    v_suggested_active boolean;
    v_suggested_cost numeric;
    v_pl_type text;
    v_tier_key text;
    v_artist_country text;
    v_artist_currency text;
    v_curator_country text;
    v_curator_currency text;
    v_artist_full numeric;
    v_curator_full numeric;
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
        -- the original submission (same tier or cheaper). Cost is the tier
        -- price in the artist's currency: that is what a resubmission would
        -- actually charge, and for NGN artists it equals the stored
        -- submission_fee the old guard compared.
        SELECT type, is_active INTO v_suggested_type, v_suggested_active
        FROM public.playlists WHERE id = p_suggested_playlist_id;
        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'message', 'Suggested playlist not found');
        END IF;
        IF NOT COALESCE(v_suggested_active, false) THEN
            RETURN json_build_object('success', false, 'message', 'The suggested playlist is not active');
        END IF;
        SELECT country INTO v_artist_country FROM public.profiles WHERE id = v_artist_id;
        v_artist_currency := public.currency_for_country(v_artist_country);
        v_tier_key := public.submission_tier_key(v_suggested_type, NULL);
        IF v_tier_key = 'free' THEN
            v_suggested_cost := 0;
        ELSE
            v_suggested_cost := public.currency_price(v_artist_currency, v_tier_key);
        END IF;
        IF v_suggested_cost > v_amount THEN
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
        -- when they accept the suggestion. amount_paid is already in the
        -- artist's currency; the row now carries it.
        IF v_amount > 0 THEN
            SELECT country INTO v_artist_country FROM public.profiles WHERE id = v_artist_id;
            v_artist_currency := public.currency_for_country(v_artist_country);
            UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
            INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id, currency)
            VALUES (v_artist_id, v_amount, 'refund', 'Refund: ' || v_submission.song_title, p_submission_id, v_artist_currency);
        END IF;

    ELSIF p_action IN ('accepted', 'approved') THEN
        IF v_amount > 0 THEN
            SELECT (role = 'admin') INTO v_curator_is_admin
            FROM public.profiles WHERE id = v_playlist_curator_id;

            IF NOT COALESCE(v_curator_is_admin, false) THEN
                -- 70% to curator, 30% stays with the platform.
                -- Curator earnings are withdrawable, in the CURATOR's currency.
                -- Same currency as the artist: the original formula untouched
                -- (bit-for-bit). Different currency: the same 70% of the tier
                -- price, expressed in the curator's currency (discount ratio
                -- preserved).
                SELECT country INTO v_artist_country FROM public.profiles WHERE id = v_artist_id;
                SELECT country INTO v_curator_country FROM public.profiles WHERE id = v_playlist_curator_id;
                v_artist_currency := public.currency_for_country(v_artist_country);
                v_curator_currency := public.currency_for_country(v_curator_country);
                IF v_artist_currency = v_curator_currency THEN
                    v_curator_share := v_amount * 0.70;
                ELSE
                    SELECT type INTO v_pl_type FROM public.playlists WHERE id = v_submission.playlist_id;
                    v_tier_key := public.submission_tier_key(v_pl_type, v_submission.tier);
                    IF v_tier_key = 'free' THEN
                        v_curator_share := 0;
                    ELSE
                        v_artist_full := public.currency_price(v_artist_currency, v_tier_key);
                        v_curator_full := public.currency_price(v_curator_currency, v_tier_key);
                        IF v_artist_full > 0 THEN
                            v_curator_share := public.currency_round(
                                v_amount * 0.70 * v_curator_full / v_artist_full, v_curator_currency);
                        ELSE
                            v_curator_share := 0;
                        END IF;
                    END IF;
                END IF;
                IF v_curator_share > 0 THEN
                    UPDATE public.profiles
                    SET balance = balance + v_curator_share,
                        withdrawable_balance = withdrawable_balance + v_curator_share
                    WHERE id = v_playlist_curator_id;
                    INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id, currency)
                    VALUES (v_playlist_curator_id, v_curator_share, 'earning', 'Earning (70%): ' || v_submission.song_title, p_submission_id, v_curator_currency);
                END IF;
            END IF;
            -- Admin-owned playlists: platform keeps 100% (no curator payout row)
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- The 5-arg entry point now delegates to the 8-arg implementation so the two
-- can never diverge again. (Nothing in the app calls it; the app passes all
-- eight parameters.)
CREATE OR REPLACE FUNCTION public.process_submission_review(
    p_submission_id uuid,
    p_action text,
    p_feedback text,
    p_curator_id uuid,
    p_tracking_slug text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN public.process_submission_review(
        p_submission_id, p_action, p_feedback, p_curator_id, p_tracking_slug,
        NULL, false, NULL);
END;
$function$;
