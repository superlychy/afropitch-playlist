-- Fix request_payout: restore the missing withdrawals-row insert.
--
-- The 20260318000001_complete_setup migration rewrote request_payout and dropped
-- step 4 (INSERT INTO public.withdrawals). Since 2026-03-18, a withdrawal request
-- deducts the user's balance and records a transaction, but no row appears in
-- public.withdrawals — so the admin Withdrawals tab never shows it and the money
-- sits deducted with no admin-visible request to approve. This restores the
-- withdrawals insert (keeping the 5,000 minimum check added by complete_setup).
CREATE OR REPLACE FUNCTION public.request_payout(
    p_user_id uuid,
    p_amount numeric,
    p_bank_name text,
    p_account_number text,
    p_account_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance numeric;
    v_withdrawal_id uuid;
BEGIN
    -- Get current balance with row lock
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    IF p_amount < 5000 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is ₦5,000');
    END IF;

    -- Deduct balance
    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;

    -- Record withdrawal transaction (money out)
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -p_amount,
        'withdrawal',
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')'
    );

    -- Create the withdrawal request row for admin processing
    INSERT INTO public.withdrawals (
        user_id,
        amount,
        bank_name,
        account_number,
        account_name,
        status
    ) VALUES (
        p_user_id,
        p_amount,
        p_bank_name,
        p_account_number,
        p_account_name,
        'pending'
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
