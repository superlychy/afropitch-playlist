-- submit_with_payment: capture Spotify cover art (2026-09-30)
--
-- Re-creates public.submit_with_payment with a new trailing parameter
-- p_cover_art_url text DEFAULT NULL. Postgres cannot widen a signature
-- with CREATE OR REPLACE (that would create an overload), so the old
-- 5-arg variant is dropped first. The body is identical to
-- 20260930231000_atomic_submit_rpc.sql except the INSERT now stores the
-- cover art URL on every inserted submission row.
--
-- Old 5-arg calls that omit p_cover_art_url would break against the new
-- signature; the only caller (src/app/api/submit/route.ts) was updated to
-- pass it in the same push.

DROP FUNCTION IF EXISTS public.submit_with_payment(uuid[], text, text, text, text);

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
  v_balance numeric;
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

  -- Lock the artist's profile row for the whole transaction.
  SELECT balance, referral_balance INTO v_balance, v_referral_balance
  FROM public.profiles
  WHERE id = v_artist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
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

  -- Spend referral balance first; wallet covers the remainder.
  v_from_referral := LEAST(COALESCE(v_referral_balance, 0), v_final_total);
  v_from_wallet := v_final_total - v_from_referral;

  IF v_from_wallet > COALESCE(v_balance, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient');
  END IF;

  -- Deduct. This runs as postgres (SECURITY DEFINER), so the profile
  -- protection trigger's trusted-writer bypass applies.
  UPDATE public.profiles
  SET balance = balance - v_from_wallet,
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
    'referral_qualified', v_referral_qualified
  );
END;
$$;

-- Only an authenticated caller may execute it; identity comes from auth.uid().
REVOKE ALL ON FUNCTION public.submit_with_payment(uuid[], text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_with_payment(uuid[], text, text, text, text, text) TO authenticated;
