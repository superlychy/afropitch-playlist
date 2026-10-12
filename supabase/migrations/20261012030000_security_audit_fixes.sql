-- Security audit fixes (2026-10-12).
-- C1: whitelist signup roles. C2/C3: withdrawal auth + INSERT lockdown.
-- C4: mixing order payment verification. C5: scoped profile reads.
-- C6: guard withdrawable_balance/referral_code. L5/L6: submission/playlist
-- update guards. B3: case-insensitive duplicate guard.

-- ============ C1: only artist/curator can self-register ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, balance, referral_code, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'artist') IN ('artist', 'curator')
         THEN NEW.raw_user_meta_data->>'role' ELSE 'artist' END,
    0,
    public.generate_referral_code(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ============ C2: reject_withdrawal requires admin/service ============
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_withdrawal_id uuid, p_reason text DEFAULT 'Rejected by Admin'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
  v_from_withdrawable numeric;
BEGIN
  IF NOT public._is_admin_or_service() THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized');
  END IF;

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
$function$;

-- ============ C3: withdrawals INSERT only via request_payout RPC ============
-- request_payout is SECURITY DEFINER and performs the INSERT itself, so no
-- direct INSERT policy is needed. Removing both permissive policies kills the
-- money-printing chain at the INSERT half (C2 fix kills the reject half).
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can insert withdrawals" ON public.withdrawals;

-- ============ C4: create_mixing_order verifies the Paystack reference ============
CREATE OR REPLACE FUNCTION public.create_mixing_order(p_song_title text, p_file_link text, p_package_id uuid, p_reference text, p_submission_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
    v_pkg record;
    v_order_id uuid;
    v_verified_amount numeric;
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    if p_song_title is null or length(trim(p_song_title)) = 0 then raise exception 'song title required'; end if;
    if p_file_link is null or length(trim(p_file_link)) = 0 then raise exception 'file link required'; end if;

    select * into v_pkg from public.mixing_packages where id = p_package_id and active = true;
    if not found then raise exception 'package not available'; end if;

    -- Payment verification: the reference must have been verified server-side
    -- via Paystack (confirm-order upserts verified_payments before calling us).
    select amount into v_verified_amount from public.verified_payments
    where reference = p_reference and used_at is null;
    if not found then raise exception 'payment not verified'; end if;
    if v_verified_amount is distinct from v_pkg.price_ngn then
        raise exception 'paid amount does not match package price';
    end if;

    -- idempotency: already created for this payment reference?
    select id into v_order_id from public.mixing_orders where paystack_reference = p_reference;
    if found then return v_order_id; end if;
    if exists (select 1 from public.transactions where reference = p_reference) then
        raise exception 'payment reference already used';
    end if;

    insert into public.mixing_orders
        (artist_id, song_title, submission_id, file_link, package_id, package_name, amount, status, paystack_reference)
    values
        (auth.uid(), trim(p_song_title), p_submission_id, trim(p_file_link), v_pkg.id, v_pkg.name, v_pkg.price_ngn, 'in_escrow', p_reference)
    returning id into v_order_id;

    insert into public.transactions (user_id, amount, type, description, reference)
    values (auth.uid(), v_pkg.price_ngn, 'payment',
            'Mixing escrow hold: ' || v_pkg.name || ' — ' || trim(p_song_title), p_reference);

    -- Consume the verification so the reference cannot be reused.
    update public.verified_payments
    set used_at = now(), order_id = v_order_id
    where reference = p_reference;

    return v_order_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_mixing_order(text, text, uuid, text, uuid) FROM anon;

-- ============ C5: scope profile reads (drop world-readable policies) ============
-- Public fan pages and track pages read via the service role (bypasses RLS),
-- so anon no longer needs SELECT. Authenticated users see their own row;
-- admins see all via is_admin().
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (public.is_admin());

-- ============ C6: guard withdrawable_balance and referral_code ============
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    -- Trusted server-side writers bypass all checks.
    IF current_user IN ('service_role', 'postgres') THEN
        RETURN NEW;
    END IF;

    -- Admins (verified from the request JWT) may change anything.
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           AND NOT (
               OLD.role = 'artist'
               AND NEW.role = 'curator'
               AND OLD.verification_status IS NOT DISTINCT FROM 'none'
           ) THEN
            RAISE EXCEPTION 'Not allowed to change role';
        END IF;

        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
           AND NOT (
               NEW.verification_status = 'pending'
               AND OLD.verification_status IN ('none', 'rejected')
           ) THEN
            RAISE EXCEPTION 'Not allowed to change verification_status';
        END IF;

        IF NEW.balance IS DISTINCT FROM OLD.balance THEN
            RAISE EXCEPTION 'Not allowed to change balance';
        END IF;

        IF NEW.referral_balance IS DISTINCT FROM OLD.referral_balance THEN
            RAISE EXCEPTION 'Not allowed to change referral_balance';
        END IF;

        IF NEW.withdrawable_balance IS DISTINCT FROM OLD.withdrawable_balance THEN
            RAISE EXCEPTION 'Not allowed to change withdrawable_balance';
        END IF;

        IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
            RAISE EXCEPTION 'Not allowed to change referral_code';
        END IF;

        IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
            RAISE EXCEPTION 'Not allowed to change is_blocked';
        END IF;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Not allowed to change email';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- ============ L5: block sensitive submission column changes ============
-- Curators legitimately UPDATE only ranking_boosted_at directly (all review
-- actions go through process_submission_review). Service role (artist link
-- editor, submit flow) and SECURITY DEFINER RPCs (owner postgres) bypass.
CREATE OR REPLACE FUNCTION public.protect_sensitive_submission_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF current_user IN ('service_role', 'postgres') THEN
        RETURN NEW;
    END IF;

    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
            RAISE EXCEPTION 'Not allowed to change amount_paid';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Not allowed to change status';
        END IF;
        IF NEW.artist_id IS DISTINCT FROM OLD.artist_id THEN
            RAISE EXCEPTION 'Not allowed to change artist_id';
        END IF;
        IF NEW.playlist_id IS DISTINCT FROM OLD.playlist_id THEN
            RAISE EXCEPTION 'Not allowed to change playlist_id';
        END IF;
        IF NEW.song_link IS DISTINCT FROM OLD.song_link THEN
            RAISE EXCEPTION 'Not allowed to change song_link';
        END IF;
        IF NEW.tracking_slug IS DISTINCT FROM OLD.tracking_slug THEN
            RAISE EXCEPTION 'Not allowed to change tracking_slug';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_sensitive_submission_columns ON public.submissions;
CREATE TRIGGER protect_sensitive_submission_columns
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_submission_columns();

-- ============ L6: curators cannot transfer playlist ownership ============
DROP POLICY IF EXISTS "Curators can update own playlists." ON public.playlists;
CREATE POLICY "Curators can update own playlists."
  ON public.playlists FOR UPDATE
  USING (auth.uid() = curator_id)
  WITH CHECK (auth.uid() = curator_id);

-- ============ B3: duplicate guard is case-insensitive ============
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
      AND lower(song_title) = lower(p_song_title)
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
