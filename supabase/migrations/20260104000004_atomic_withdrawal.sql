-- RPC for Atomic Payout Request
-- Handles Balance Deduction + Transaction Record + Withdrawal Request Record atomically.

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
AS $$
DECLARE
    v_current_balance numeric;
    v_withdrawal_id uuid;
BEGIN
    -- 1. Check Balance and Lock Row
    SELECT balance INTO v_current_balance 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 2. Deduct Balance
    UPDATE public.profiles 
    SET balance = balance - p_amount 
    WHERE id = p_user_id;

    -- 3. Create Transaction Record (shows in history immediately as Money Out)
    INSERT INTO public.transactions (
        user_id, 
        amount, 
        type, 
        description
    ) VALUES (
        p_user_id, 
        -p_amount, -- Negative for money leaving
        'withdrawal', 
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')'
    );

    -- 4. Create Withdrawal Request Record (for Admin to process)
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
