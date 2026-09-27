-- Money-function authorization hardening (2026-09-27) — v2 with DROPs for
-- functions that carry parameter defaults.

CREATE OR REPLACE FUNCTION public._is_admin_or_service()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT auth.role() = 'service_role'
        OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') = 'admin';
$$;

-- 1. request_payout (6-arg): only the account owner may request.
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
    v_role text;
    v_withdrawal_id uuid;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT balance, role INTO v_balance, v_role FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    IF p_amount < 5000 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is ₦5,000');
    END IF;

    IF v_role = 'artist' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RETURN json_build_object('success', false, 'message', 'Please provide a reason for the withdrawal');
    END IF;

    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -p_amount,
        'withdrawal',
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')'
    );

    INSERT INTO public.withdrawals (
        user_id, amount, bank_name, account_number, account_name, reason, status
    ) VALUES (
        p_user_id, p_amount, p_bank_name, p_account_number, p_account_name,
        NULLIF(btrim(p_reason), ''), 'pending'
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. request_payout (legacy 5-arg): delegate so the auth check lives in one place.
DROP FUNCTION IF EXISTS public.request_payout(uuid, numeric, text, text, text);
CREATE FUNCTION public.request_payout(
    p_user_id uuid,
    p_amount numeric,
    p_bank_name text,
    p_account_number text,
    p_account_name text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.request_payout(p_user_id, p_amount, p_bank_name, p_account_number, p_account_name, NULL);
$$;

-- 3. reject_withdrawal: admin-only, pending-only.
DROP FUNCTION IF EXISTS public.reject_withdrawal(uuid, text);
CREATE FUNCTION public.reject_withdrawal(p_withdrawal_id uuid, p_reason text DEFAULT 'Rejected by Admin'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
    DECLARE v_wd record;
    BEGIN
      IF NOT public._is_admin_or_service() THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
      END IF;

      SELECT * INTO v_wd FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
      IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Withdrawal not found'); END IF;
      IF v_wd.status != 'pending' THEN
        RETURN json_build_object('success', false, 'message', 'Withdrawal already processed');
      END IF;

      UPDATE public.profiles SET balance = balance + v_wd.amount WHERE id = v_wd.user_id;
      UPDATE public.withdrawals SET status = 'rejected' WHERE id = p_withdrawal_id;
      INSERT INTO public.transactions (user_id, amount, type, description) VALUES (v_wd.user_id, v_wd.amount, 'refund', 'Withdrawal rejected: ' || p_reason);
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
$function$;

-- 4. pay_for_submission: only from your own balance.
DROP FUNCTION IF EXISTS public.pay_for_submission(uuid, numeric, text);
CREATE FUNCTION public.pay_for_submission(p_user_id uuid, p_amount numeric, p_description text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_balance numeric;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;

    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_amount, 'payment', p_description);

    RETURN true;
END;
$function$;

-- 5. increment_balance: admin/service-role only.
DROP FUNCTION IF EXISTS public.increment_balance(uuid, numeric);
CREATE FUNCTION public.increment_balance(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public._is_admin_or_service() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.profiles
  SET balance = balance + increment_balance.amount
  WHERE id = increment_balance.user_id;
END;
$function$;

-- 6. admin_top_up_user: admin/service-role only.
DROP FUNCTION IF EXISTS public.admin_top_up_user(uuid, numeric, text);
CREATE FUNCTION public.admin_top_up_user(p_user_id uuid, p_amount numeric, p_description text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
    BEGIN
      IF NOT public._is_admin_or_service() THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
      END IF;
      IF p_amount <= 0 THEN RETURN json_build_object('success', false, 'message', 'Amount must be positive'); END IF;
      UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_user_id;
      INSERT INTO public.transactions (user_id, amount, type, description) VALUES (p_user_id, p_amount, 'deposit', p_description);
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
$function$;

-- 7. process_deposit: service-role only. All crediting goes through the
-- verified webhook or /api/payment/status (Paystack-verified).
DROP FUNCTION IF EXISTS public.process_deposit(uuid, numeric, text, text);
CREATE FUNCTION public.process_deposit(p_user_id uuid, p_amount numeric, p_reference text, p_description text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
    DECLARE v_existing_ref text;
    BEGIN
      IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
      END IF;
      SELECT reference INTO v_existing_ref FROM public.transactions WHERE reference = p_reference LIMIT 1;
      IF v_existing_ref IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Payment already processed');
      END IF;
      UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_user_id;
      INSERT INTO public.transactions (user_id, amount, type, description, reference)
      VALUES (p_user_id, p_amount, 'deposit', COALESCE(p_description, 'Wallet Deposit: ' || p_reference), p_reference);
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
$function$;
