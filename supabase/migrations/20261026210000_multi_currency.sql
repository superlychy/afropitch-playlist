-- Multi-currency pricing (approved 2026-10-26, Path A).
--
-- Display in the visitor's local currency, Paystack always charges naira.
-- Currency follows the country on the account (fixed; changing country
-- means re-registering). Logged-out visitors resolve by detected location
-- in the app; any country not listed maps to NGN.
--
-- Behaviour-preserving for every existing user: profiles.country is NULL
-- until the new signup code runs, and NULL maps to NGN with the exact
-- prices the old hardcoded values used. Only rows carrying a priced
-- country take the new paths.
--
-- Mirror: config/currency.ts holds the same tables for the app. Keep the
-- two in sync when a price changes.

-- 1. Account country (NULL = no country picked = NGN).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text;

-- 2. Currency audit columns (NULL = NGN, the pre-multi-currency rows).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS currency text;

-- 3. Price tables (single source of truth for the money functions).
CREATE TABLE IF NOT EXISTS public.currency_prices (
  currency text NOT NULL,
  key text NOT NULL,
  price numeric NOT NULL,
  PRIMARY KEY (currency, key)
);

INSERT INTO public.currency_prices (currency, key, price) VALUES
  ('NGN','standard',3000),('NGN','express',5000),('NGN','exclusive',13500),
  ('NGN','demo_polish',35000),('NGN','full_mix',65000),('NGN','mix_master',100000),
  ('NGN','referral',1000),('NGN','payout_min',5000),('NGN','ngn_per_unit',1),
  ('USD','standard',2),('USD','express',4),('USD','exclusive',10),
  ('USD','demo_polish',26),('USD','full_mix',48),('USD','mix_master',74),
  ('USD','referral',1),('USD','payout_min',4),('USD','ngn_per_unit',1350),
  ('ZAR','standard',35),('ZAR','express',60),('ZAR','exclusive',165),
  ('ZAR','demo_polish',430),('ZAR','full_mix',800),('ZAR','mix_master',1250),
  ('ZAR','referral',10),('ZAR','payout_min',60),('ZAR','ngn_per_unit',81),
  ('GHS','standard',25),('GHS','express',45),('GHS','exclusive',115),
  ('GHS','demo_polish',300),('GHS','full_mix',560),('GHS','mix_master',860),
  ('GHS','referral',10),('GHS','payout_min',45),('GHS','ngn_per_unit',116),
  ('KES','standard',300),('KES','express',500),('KES','exclusive',1300),
  ('KES','demo_polish',3400),('KES','full_mix',6250),('KES','mix_master',9600),
  ('KES','referral',100),('KES','payout_min',500),('KES','ngn_per_unit',10.4),
  ('XAF','standard',1300),('XAF','express',2200),('XAF','exclusive',5900),
  ('XAF','demo_polish',15300),('XAF','full_mix',28400),('XAF','mix_master',43700),
  ('XAF','referral',450),('XAF','payout_min',2200),('XAF','ngn_per_unit',2.29),
  ('TZS','standard',6000),('TZS','express',10000),('TZS','exclusive',26500),
  ('TZS','demo_polish',68500),('TZS','full_mix',127500),('TZS','mix_master',196000),
  ('TZS','referral',2000),('TZS','payout_min',10000),('TZS','ngn_per_unit',0.509)
ON CONFLICT (currency, key) DO UPDATE SET price = EXCLUDED.price;

-- 4. Helpers.
CREATE OR REPLACE FUNCTION public.currency_for_country(p_country text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE UPPER(COALESCE(TRIM(p_country), ''))
    WHEN 'NG' THEN 'NGN'
    WHEN 'US' THEN 'USD'
    WHEN 'ZA' THEN 'ZAR'
    WHEN 'GH' THEN 'GHS'
    WHEN 'KE' THEN 'KES'
    WHEN 'CM' THEN 'XAF'
    WHEN 'TZ' THEN 'TZS'
    ELSE 'NGN'
  END;
$$;

CREATE OR REPLACE FUNCTION public.currency_price(p_currency text, p_key text)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT price FROM public.currency_prices
      WHERE currency = p_currency AND key = p_key),
    (SELECT price FROM public.currency_prices
      WHERE currency = 'NGN' AND key = p_key),
    0);
$$;

CREATE OR REPLACE FUNCTION public.currency_symbol(p_currency text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_currency
    WHEN 'USD' THEN '$'
    WHEN 'ZAR' THEN 'R'
    WHEN 'GHS' THEN '₵'
    WHEN 'KES' THEN 'KSh'
    WHEN 'XAF' THEN 'FCFA '
    WHEN 'TZS' THEN 'TSh '
    ELSE '₦'
  END;
$$;

-- Whole units except the cent-using currencies (USD/ZAR/GHS keep 2dp).
CREATE OR REPLACE FUNCTION public.currency_round(p_amount numeric, p_currency text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_currency IN ('USD', 'ZAR', 'GHS')
    THEN ROUND(p_amount, 2) ELSE ROUND(p_amount, 0) END;
$$;

-- Tier key shared by submit and review: a playlist whose type fixes the
-- price wins; otherwise the tier the artist picked.
CREATE OR REPLACE FUNCTION public.submission_tier_key(
  p_playlist_type text, p_picked_tier text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_playlist_type = 'exclusive' THEN 'exclusive'
    WHEN p_playlist_type = 'express' THEN 'express'
    WHEN p_playlist_type = 'free' THEN 'free'
    WHEN p_picked_tier = 'exclusive' THEN 'exclusive'
    WHEN p_picked_tier = 'express' THEN 'express'
    ELSE 'standard'
  END;
$$;

-- 5. submit_with_payment: price in the ARTIST's currency. The spend order,
-- bulk discount, duplicate guard and curator gate are unchanged; only the
-- denomination moves (NGN rows behave exactly as before).
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
  v_country text;
  v_currency text;
  v_balance numeric;
  v_withdrawable numeric;
  v_referral_balance numeric;
  v_costs numeric[] := '{}';
  v_pid uuid;
  v_pl_type text;
  v_tier_key text;
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
  v_referrer_country text;
  v_referrer_currency text;
  v_reward numeric;
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
  SELECT balance, withdrawable_balance, referral_balance, role, country
  INTO v_balance, v_withdrawable, v_referral_balance, v_role, v_country
  FROM public.profiles
  WHERE id = v_artist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_currency := public.currency_for_country(v_country);

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

  -- Server-side pricing: the single source of truth, now in the artist's
  -- currency. The client-supplied total is never read.
  FOREACH v_pid IN ARRAY p_playlist_ids LOOP
    SELECT type INTO v_pl_type FROM public.playlists WHERE id = v_pid;
    v_tier_key := public.submission_tier_key(v_pl_type, p_tier);
    IF v_tier_key = 'free' THEN
      v_cost := 0;
    ELSE
      v_cost := public.currency_price(v_currency, v_tier_key);
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
      (artist_id, playlist_id, song_title, artist_name, song_link, tier, amount_paid, currency, cover_art_url, status)
    VALUES
      (v_artist_id, p_playlist_ids[i], p_song_title, p_artist_name, p_song_link, p_tier, v_final_cost, v_currency, p_cover_art_url, 'pending');
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
    INSERT INTO public.transactions (user_id, amount, type, description, currency)
    VALUES (v_artist_id, -v_final_total, 'payment', v_desc, v_currency);
  END IF;

  -- Referral qualification: the referee's first PAID submission flips the
  -- single pending row to qualified and credits the referrer, atomically.
  -- The reward is priced in the REFERRER's currency. Re-running can never
  -- double-pay (no pending row).
  IF v_final_total > 0 THEN
    UPDATE public.referrals
    SET status = 'qualified', qualified_at = now()
    WHERE referee_id = v_artist_id AND status = 'pending'
    RETURNING referrer_id INTO v_referrer_id;

    IF FOUND THEN
      v_referral_qualified := true;

      SELECT country INTO v_referrer_country FROM public.profiles WHERE id = v_referrer_id;
      v_referrer_currency := public.currency_for_country(v_referrer_country);
      v_reward := public.currency_price(v_referrer_currency, 'referral');

      UPDATE public.profiles
      SET referral_balance = referral_balance + v_reward
      WHERE id = v_referrer_id;

      INSERT INTO public.transactions (user_id, amount, type, description, currency)
      VALUES (v_referrer_id, v_reward, 'earning',
              'Referral reward: ' || p_artist_name || ' paid for their first submission (credit for submissions, not withdrawable)',
              v_referrer_currency);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'charged_total', v_final_total,
    'currency', v_currency,
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

-- 6. process_submission_review: the curator's 70% share lands in the
-- CURATOR's currency. Same currency as the artist: the original formula
-- untouched (bit-for-bit). Different currency: the same 70% of the tier
-- price, expressed in the curator's currency (discount ratio preserved).
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
        -- amount_paid is already in the artist's currency.
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
                -- Curator earnings are withdrawable.
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
$$;

-- 7. request_payout: the minimum is priced in the CURATOR's currency.
-- The requested amount itself is already in that currency (the dashboard
-- asks in the viewer's currency), so only the floor moves.
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
    v_country text;
    v_currency text;
    v_min numeric;
    v_withdrawal_id uuid;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT balance, withdrawable_balance, role, country
    INTO v_balance, v_withdrawable, v_role, v_country
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    v_currency := public.currency_for_country(v_country);
    v_min := public.currency_price(v_currency, 'payout_min');

    -- Artists do not withdraw. Mixing refunds go by bank transfer instead.
    IF v_role = 'artist' THEN
        RETURN json_build_object('success', false, 'message', 'Withdrawals are not available for artists');
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

    IF p_amount < v_min THEN
        RETURN json_build_object('success', false, 'message',
            'Minimum withdrawal is ' || public.currency_symbol(v_currency) || v_min::text);
    END IF;

    IF v_role = 'artist' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RETURN json_build_object('success', false, 'message', 'Please provide a reason for the withdrawal');
    END IF;

    UPDATE public.profiles
    SET balance = balance - p_amount,
        withdrawable_balance = withdrawable_balance - p_amount
    WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description, currency)
    VALUES (
        p_user_id,
        -p_amount,
        'withdrawal',
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')',
        v_currency
    );

    INSERT INTO public.withdrawals (
        user_id, amount, bank_name, account_number, account_name, reason, status, from_withdrawable, currency
    ) VALUES (
        p_user_id, p_amount, p_bank_name, p_account_number, p_account_name,
        NULLIF(btrim(p_reason), ''), 'pending', p_amount, v_currency
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 8. refund_mix: mixing orders are NGN-denominated (Paystack charges
-- naira), but the artist's wallet is in the artist's currency, so the
-- refund converts at the fixed table rate.
CREATE OR REPLACE FUNCTION public.refund_mix(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_role text;
    v_country text;
    v_currency text;
    v_credit numeric;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role != 'admin' THEN RAISE EXCEPTION 'not authorized - admin only'; END IF;
    IF v_order.status NOT IN ('in_escrow','in_progress','delivered') THEN
        RAISE EXCEPTION 'order cannot be refunded'; END IF;

    UPDATE public.mixing_orders
       SET status = 'refunded',
           admin_note = COALESCE(p_reason, admin_note),
           refund_requested_at = NULL,
           refund_request_reason = NULL,
           updated_at = now()
     WHERE id = p_order_id;

    SELECT country INTO v_country FROM public.profiles WHERE id = v_order.artist_id;
    v_currency := public.currency_for_country(v_country);
    IF v_currency = 'NGN' THEN
        v_credit := v_order.amount;
    ELSE
        v_credit := public.currency_round(
            v_order.amount / public.currency_price(v_currency, 'ngn_per_unit'), v_currency);
    END IF;

    UPDATE public.profiles
       SET balance = balance + v_credit,
           withdrawable_balance = withdrawable_balance + v_credit
     WHERE id = v_order.artist_id;

    INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id, currency)
    VALUES (v_order.artist_id, v_credit, 'refund',
            'Mixing refund: ' || v_order.package_name || ' — ' || v_order.song_title
                || COALESCE(' (' || p_reason || ')', ''),
            v_order.submission_id, v_currency);
END;
$$;

-- 9. reject_withdrawal: the amount is already in the user's currency
-- (the withdrawal was requested in it); only the audit column is new.
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
  v_country text;
  v_currency text;
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

  SELECT country INTO v_country FROM public.profiles WHERE id = v_user_id;
  v_currency := public.currency_for_country(v_country);

  INSERT INTO public.transactions (user_id, amount, type, description, currency)
  VALUES (v_user_id, v_amount, 'refund', 'Withdrawal rejected: ' || p_reason, v_currency);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 10. process_deposit: signature unchanged (callers pass the credit amount,
-- already converted to the user's currency by the API routes). The audit
-- column is derived from the user's own country here.
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_ref text;
  v_country text;
  v_currency text;
BEGIN
  -- Idempotency: check if this reference was already processed
  SELECT reference INTO v_existing_ref
  FROM public.transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_ref IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment already processed');
  END IF;

  SELECT country INTO v_country FROM public.profiles WHERE id = p_user_id;
  v_currency := public.currency_for_country(v_country);

  -- Credit wallet atomically
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, type, description, reference, currency)
  VALUES (
    p_user_id,
    p_amount,
    'deposit',
    COALESCE(p_description, 'Wallet Deposit: ' || p_reference),
    p_reference,
    v_currency
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 11. handle_new_user: carry the signup country onto the profile when it
-- is one of the priced countries; anything else (including "OTHER") stays
-- NULL, which resolves to NGN.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, balance, referral_code, country, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'artist') IN ('artist', 'curator')
         THEN NEW.raw_user_meta_data->>'role' ELSE 'artist' END,
    0,
    public.generate_referral_code(),
    CASE WHEN NEW.raw_user_meta_data->>'country' IN ('NG','ZA','GH','KE','CM','TZ','US')
         THEN NEW.raw_user_meta_data->>'country' ELSE NULL END,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
