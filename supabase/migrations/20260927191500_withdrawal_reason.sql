-- Add withdrawal reason: artists/curators must state why they're withdrawing,
-- shown to the admin reviewing the request.
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reason text;

-- Update request_payout to accept and store the reason.
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

    IF p_reason IS NULL OR btrim(p_reason) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Please provide a reason for the withdrawal');
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
        reason,
        status
    ) VALUES (
        p_user_id,
        p_amount,
        p_bank_name,
        p_account_number,
        p_account_name,
        btrim(p_reason),
        'pending'
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
