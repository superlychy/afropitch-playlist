-- Trigger a test notification via Transaction Insert

DO $$
DECLARE
    v_user_id uuid;
    v_email text;
BEGIN
    -- 1. Get a user from Auth
    SELECT id, email INTO v_user_id, v_email FROM auth.users LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found User: %', v_email;

        -- 2. Ensure Profile Exists (Fix for foreign key violation)
        INSERT INTO public.profiles (id, email, full_name, role, balance)
        VALUES (v_user_id, v_email, 'Test User', 'artist', 0)
        ON CONFLICT (id) DO NOTHING;

        -- 3. Insert dummy transaction
        INSERT INTO public.transactions (user_id, amount, type, description)
        VALUES (v_user_id, 100, 'deposit', 'Test Transaction for Resend API ' || now());
        
        RAISE NOTICE 'Test Transaction Inserted for User ID: %. Check Supabase Edge Function Logs.', v_user_id;
    ELSE
        RAISE NOTICE 'No users found to test. Please sign up a user first via the app.';
    END IF;
END $$;
