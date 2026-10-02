-- Withdrawable balance + role-differentiated withdrawals (2026-10-02)
--
-- Policy (Max, 2026-10-02):
--   * Artists may withdraw ONLY mixing refunds. Wallet deposits are
--     spend-only (submissions) and can never be withdrawn.
--   * Curators keep withdrawing their review earnings (unchanged).
--   * One account = one role (already enforced by the single role column).
--   * Curators may not submit songs (enforced in submit_with_payment).
--
-- Mechanism: profiles.withdrawable_balance tracks the portion of balance
-- that may leave the wallet. Invariant: withdrawable_balance <= balance.
--   * Credited by: refund_mix (artist mixing refunds), curator review
--     earnings in process_submission_review.
--   * Never credited by: Paystack deposits (process_deposit), admin
--     top-ups (admin_top_up_user), declined-submission refunds.
--   * Debited by: request_payout (both columns), submit_with_payment
--     (locked funds first, withdrawable last, so refund money is protected).
--   * Restored by: reject_withdrawal (uses withdrawals.from_withdrawable
--     so legacy rows that predate this column restore correctly).
--
-- Backfill (verified live 2026-10-02 before applying):
--   * Curators: withdrawable = balance (only curator holding a balance is
--     Experience at 18244, entirely review earnings; no deposits present).
--   * Artists/admins: 0 (no live artist holds mixing-refund money).

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS withdrawable_balance numeric NOT NULL DEFAULT 0;

UPDATE public.profiles
SET withdrawable_balance = balance
WHERE role = 'curator' AND COALESCE(withdrawable_balance, 0) = 0;

-- Track how much of each withdrawal came from the withdrawable pool so
-- rejections restore the pools precisely.
ALTER TABLE public.withdrawals
ADD COLUMN IF NOT EXISTS from_withdrawable numeric NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- request_payout: gate on withdrawable_balance instead of total balance.
-- Signature unchanged; existing grants persist through CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_payout(
    p_user_id uuid,
    p_amount numeric,
    p_bank_name text,
    p_account_number text,
    p_account_name text,
    p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance numeric;
    v_withdrawable numeric;
    v_role text;
    v_withdrawal_id uuid;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT balance, withdrawable_balance, role
    INTO v_balance, v_withdrawable, v_role
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF COALESCE(v_withdrawable, 0) < p_amount THEN
        -- Artist has the money in their wallet but it is not withdrawable
        -- (deposits): explain the rule instead of a bare "insufficient".
        IF v_role = 'artist' AND COALESCE(v_balance, 0) >= p_amount THEN
            RETURN json_build_object('success', false, 'message',
                'Only mixing refunds can be withdrawn. Deposits can only be spent on submissions.');
        END IF;
        RETURN json_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    IF p_amount < 5000 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is ₦5,000');
    END IF;

    IF v_role = 'artist' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RETURN json_build_object('success', false, 'message', 'Please provide a reason for the withdrawal');
    END IF;

    UPDATE public.profiles
    SET balance = balance - p_amount,
        withdrawable_balance = withdrawable_balance - p_amount
    WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -p_amount,
        'withdrawal',
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')'
    );

    INSERT INTO public.withdrawals (
        user_id, amount, bank_name, account_number, account_name, reason, status, from_withdrawable
    ) VALUES (
        p_user_id, p_amount, p_bank_name, p_account_number, p_account_name,
        NULLIF(btrim(p_reason), ''), 'pending', p_amount
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- refund_mix: mixing refunds are the withdrawable source for artists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_mix(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role != 'admin' THEN RAISE EXCEPTION 'not authorized - admin only'; END IF;
    IF v_order.status NOT IN ('in_escrow','in_progress','delivered') THEN
        RAISE EXCEPTION 'order cannot be refunded';
    END IF;

    UPDATE public.mixing_orders
       SET status = 'refunded',
           admin_note = COALESCE(p_reason, admin_note),
           refund_requested_at = NULL,
           refund_request_reason = NULL,
           updated_at = now()
     WHERE id = p_order_id;

    UPDATE public.profiles
       SET balance = balance + v_order.amount,
           withdrawable_balance = withdrawable_balance + v_order.amount
     WHERE id = v_order.artist_id;

    INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
    VALUES (v_order.artist_id, v_order.amount, 'refund',
            'Mixing refund: ' || v_order.package_name || ' — ' || v_order.song_title
                || COALESCE(' (' || p_reason || ')', ''),
            v_order.submission_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- reject_withdrawal: restore both pools precisely via from_withdrawable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT 'Rejected by Admin'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_from_withdrawable numeric;
BEGIN
  SELECT user_id, amount, status, COALESCE(from_withdrawable, 0)
  INTO v_user_id, v_amount, v_status, v_from_withdrawable
  FROM withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;

  IF v_status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Withdrawal is not pending');
  END IF;

  -- Refund to user wallet: restore both pools precisely.
  UPDATE public.profiles
  SET balance = balance + v_amount,
      withdrawable_balance = withdrawable_balance + v_from_withdrawable
  WHERE id = v_user_id;

  UPDATE withdrawals SET status = 'rejected' WHERE id = p_withdrawal_id;

  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_amount, 'refund', 'Withdrawal rejected: ' || p_reason);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- submit_with_payment: curators cannot submit songs; spending order is
-- referral balance -> locked wallet funds (deposits) -> withdrawable funds,
-- so an artist's withdrawable refund money is spent last and protected.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_with_payment(
  p_playlist_ids uuid[],
  p_song_title text,
  p_artist_name text,
  p_song_link text,
  p_tier text,
  p_cover_art_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist_id uuid := auth.uid();
  v_role text;
  v_balance numeric;
  v_withdrawable numeric;
  v_referral_balance numeric;
  v_costs numeric[] := '{}';
  v_pid uuid;
  v_pl_type text;
  v_cost numeric;
  v_paid_total numeric := 0;
  v_paid_count int := 0;
  v_discount numeric := 0;
  v_final_total numeric;
  v_from_referral numeric;
  v_from_locked numeric;
  v_from_withdrawable numeric;
  v_from_wallet numeric;
  v_discount_per_item numeric := 0;
  v_final_cost numeric;
  v_referrer_id uuid;
  v_referral_qualified boolean := false;
  v_desc text;
  v_n int;
BEGIN
  IF v_artist_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_n := COALESCE(array_length(p_playlist_ids, 1), 0);
  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_playlists');
  END IF;
  IF p_song_title IS NULL OR p_song_title = ''
     OR p_song_link IS NULL OR p_song_link = ''
     OR p_artist_name IS NULL OR p_artist_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_fields');
  END IF;

  -- Lock the caller's profile row for the whole transaction.
  SELECT balance, withdrawable_balance, referral_balance, role
  INTO v_balance, v_withdrawable, v_referral_balance, v_role
  FROM public.profiles
  WHERE id = v_artist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  -- Curators curate; they do not submit songs.
  IF v_role = 'curator' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_artist');
  END IF;

  -- Duplicate guard: same artist + song + any of the selected playlists.
  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE artist_id = v_artist_id
      AND song_title = p_song_title
      AND playlist_id = ANY(p_playlist_ids)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate');
  END IF;

  -- Server-side pricing: the single source of truth. The client-supplied
  -- total is never read.
  FOREACH v_pid IN ARRAY p_playlist_ids LOOP
    SELECT type INTO v_pl_type FROM public.playlists WHERE id = v_pid;
    IF v_pl_type = 'exclusive' THEN
      v_cost := 13500;
    ELSIF v_pl_type = 'express' THEN
      v_cost := 5000;
    ELSIF v_pl_type = 'free' THEN
      v_cost := 0;
    ELSE
      v_cost := CASE p_tier
                  WHEN 'express' THEN 5000
                  WHEN 'exclusive' THEN 13500
                  ELSE 3000
                END;
    END IF;
    v_costs := v_costs || v_cost;
    IF v_cost > 0 THEN
      v_paid_total := v_paid_total + v_cost;
      v_paid_count := v_paid_count + 1;
    END IF;
  END LOOP;

  IF v_paid_count >= 7 THEN
    v_discount := floor(v_paid_total * 0.1);
  END IF;
  v_final_total := v_paid_total - v_discount;
  IF v_paid_count > 0 THEN
    v_discount_per_item := v_discount / v_paid_count;
  END IF;

  -- Spend referral balance first, then locked wallet funds (deposits),
  -- then withdrawable funds last so refund money is protected.
  v_from_referral := LEAST(COALESCE(v_referral_balance, 0), v_final_total);
  v_from_wallet := v_final_total - v_from_referral;

  IF v_from_wallet > COALESCE(v_balance, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient');
  END IF;

  v_from_locked := LEAST(GREATEST(COALESCE(v_balance, 0) - COALESCE(v_withdrawable, 0), 0), v_from_wallet);
  v_from_withdrawable := v_from_wallet - v_from_locked;

  -- Deduct. This runs as postgres (SECURITY DEFINER), so the profile
  -- protection trigger's trusted-writer bypass applies.
  UPDATE public.profiles
  SET balance = balance - v_from_wallet,
      withdrawable_balance = withdrawable_balance - v_from_withdrawable,
      referral_balance = referral_balance - v_from_referral
  WHERE id = v_artist_id;

  -- One submission per playlist, carrying the discounted per-item cost and
  -- the Spotify cover art URL (nullable).
  FOR i IN 1 .. v_n LOOP
    v_cost := v_costs[i];
    v_final_cost := CASE
                      WHEN v_cost > 0 THEN GREATEST(0, v_cost - v_discount_per_item)
                      ELSE 0
                    END;
    INSERT INTO public.submissions
      (artist_id, playlist_id, song_title, artist_name, song_link, tier, amount_paid, cover_art_url, status)
    VALUES
      (v_artist_id, p_playlist_ids[i], p_song_title, p_artist_name, p_song_link, p_tier, v_final_cost, p_cover_art_url, 'pending');
  END LOOP;

  -- Payment transaction on the artist.
  IF v_final_total > 0 THEN
    v_desc := 'Submission Fee: ' || v_n || ' Playlists';
    IF v_discount > 0 THEN
      v_desc := v_desc || ' (10% bulk discount)';
    END IF;
    IF v_from_referral > 0 THEN
      v_desc := v_desc || ' (' || v_from_referral::text || ' from referral balance)';
    END IF;
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (v_artist_id, -v_final_total, 'payment', v_desc);
  END IF;

  -- Referral qualification: the referee's first PAID submission flips the
  -- single pending row to qualified and credits the referrer 1000 referral
  -- balance, atomically. Re-running can never double-pay (no pending row).
  IF v_final_total > 0 THEN
    UPDATE public.referrals
    SET status = 'qualified', qualified_at = now()
    WHERE referee_id = v_artist_id AND status = 'pending'
    RETURNING referrer_id INTO v_referrer_id;

    IF FOUND THEN
      v_referral_qualified := true;

      UPDATE public.profiles
      SET referral_balance = referral_balance + 1000
      WHERE id = v_referrer_id;

      INSERT INTO public.transactions (user_id, amount, type, description)
      VALUES (v_referrer_id, 1000, 'earning',
              'Referral reward: ' || p_artist_name || ' paid for their first submission (credit for submissions, not withdrawable)');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'charged_total', v_final_total,
    'from_referral', v_from_referral,
    'from_wallet', v_from_wallet,
    'from_withdrawable', v_from_withdrawable,
    'referral_qualified', v_referral_qualified
  );
END;
$$;

-- Only an authenticated caller may execute it; identity comes from auth.uid().
REVOKE ALL ON FUNCTION public.submit_with_payment(uuid[], text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_with_payment(uuid[], text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- process_submission_review: curator review earnings are withdrawable for
-- curators. Declined-submission refunds stay spend-only (policy default;
-- only mixing refunds are withdrawable for artists).
-- ---------------------------------------------------------------------------
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
                VALUES (v_playlist_curator_id, v_curator_share, 'earning', 'Earning (70%): ' || v_submission.song_title, p_submission_id);
            END IF;
            -- Admin-owned playlists: platform keeps 100% (no curator payout row)
        END IF;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
