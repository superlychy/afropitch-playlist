-- ============================================
-- FIX: Credit 8000 to admin@pressplaymusics.com
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Find the user and check current balance
DO $$
DECLARE
    v_user_id uuid;
    v_current_balance numeric;
    v_new_balance numeric;
BEGIN
    -- Get user ID and current balance
    SELECT id, balance INTO v_user_id, v_current_balance
    FROM public.profiles
    WHERE email = 'admin@pressplaymusics.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User admin@pressplaymusics.com not found!';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found user: admin@pressplaymusics.com';
    RAISE NOTICE '   User ID: %', v_user_id;
    RAISE NOTICE '   Current balance: ₦%', v_current_balance;

    -- Check if 8000 deposit already exists
    IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE user_id = v_user_id
        AND amount = 8000
        AND type = 'deposit'
        LIMIT 1
    ) THEN
        RAISE NOTICE '⚠️  8000 deposit already exists for this user';
        RETURN;
    END IF;

    -- Use admin_top_up_user function (already exists in migration)
    PERFORM public.admin_top_up_user(
        p_user_id := v_user_id,
        p_amount := 8000,
        p_description := 'Manual fix: Payment via Paystack (admin@pressplaymusics.com) - Date: 2026-03-22'
    );

    -- Verify the new balance
    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE id = v_user_id;

    RAISE NOTICE '✅ Payment credited successfully!';
    RAISE NOTICE '   Previous balance: ₦%', v_current_balance;
    RAISE NOTICE '   New balance: ₦%', v_new_balance;
    RAISE NOTICE '   Amount added: ₦8000';

    -- Log the transaction record
    SELECT * INTO v_new_balance
    FROM public.transactions
    WHERE user_id = v_user_id
    AND amount = 8000
    AND type = 'deposit'
    ORDER BY created_at DESC
    LIMIT 1;

    RAISE NOTICE '   Transaction recorded: ✓';
END $$;

-- Step 2: Verify the fix
SELECT
    p.email,
    p.full_name,
    p.balance,
    t.amount,
    t.type,
    t.description,
    t.created_at
FROM public.profiles p
LEFT JOIN public.transactions t ON p.id = t.user_id
WHERE p.email = 'admin@pressplaymusics.com'
ORDER BY t.created_at DESC;
