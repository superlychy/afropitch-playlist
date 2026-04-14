-- ============================================
-- AfroPitch Complete Database Migration
-- Handles: profiles trigger, RPCs, functions
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, balance, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist'),
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Process Deposit (atomic wallet credit for Paystack payments)
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
BEGIN
  -- Idempotency: check if this reference was already processed
  SELECT reference INTO v_existing_ref
  FROM public.transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_ref IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment already processed');
  END IF;

  -- Credit wallet atomically
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, type, description, reference)
  VALUES (
    p_user_id,
    p_amount,
    'deposit',
    COALESCE(p_description, 'Wallet Deposit: ' || p_reference),
    p_reference
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Process Submission Review (atomic accept/decline with money flow)
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
AS $$
DECLARE
  v_submission record;
  v_artist_id uuid;
  v_amount numeric;
  v_playlist_curator_id uuid;
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

  -- Update submission
  UPDATE public.submissions
  SET status = p_action,
      feedback = p_feedback,
      updated_at = now(),
      tracking_slug = CASE WHEN p_action = 'accepted' THEN p_tracking_slug ELSE tracking_slug END
  WHERE id = p_submission_id;

  v_artist_id := v_submission.artist_id;
  v_amount := v_submission.amount_paid;

  IF p_action = 'declined' OR p_action = 'rejected' THEN
    -- Refund to artist
    IF v_amount > 0 THEN
      UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_artist_id;
      INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
      VALUES (v_artist_id, v_amount, 'refund', 'Refund: ' || v_submission.song_title, p_submission_id);
    END IF;

  ELSIF p_action = 'accepted' OR p_action = 'approved' THEN
    -- Pay curator
    IF v_amount > 0 THEN
      UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_playlist_curator_id;
      INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
      VALUES (v_playlist_curator_id, v_amount, 'earning', 'Earning: ' || v_submission.song_title, p_submission_id);
    END IF;
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. Request Payout (atomic curator withdrawal)
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
  v_balance numeric;
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

  -- Record withdrawal
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (
    p_user_id,
    -p_amount,
    'withdrawal',
    'Payout to ' || p_bank_name || ' ' || p_account_number || ' (' || p_account_name || ')'
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. Track submission click (public RPC for redirect tracking)
CREATE OR REPLACE FUNCTION public.track_submission_click(slug_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_song_link text;
BEGIN
  SELECT song_link INTO v_song_link
  FROM public.submissions
  WHERE tracking_slug = slug_input AND status = 'accepted';

  IF v_song_link IS NULL THEN
    RETURN NULL;
  END IF;

  -- Increment clicks atomically
  UPDATE public.submissions
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE tracking_slug = slug_input;

  RETURN v_song_link;
END;
$$;

-- 6. Increment clicks on tracking page (server component call)
CREATE OR REPLACE FUNCTION public.increment_clicks(
  submission_id uuid,
  ip_address text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.submissions
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = submission_id;
END;
$$;

-- 7. Analytics duration increment
CREATE OR REPLACE FUNCTION public.increment_analytics_duration(
  p_session_id text,
  p_seconds int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visits
  SET duration_seconds = COALESCE(duration_seconds, 0) + p_seconds,
      last_seen_at = NOW()
  WHERE session_id = p_session_id;
END;
$$;

-- 8. Analytics clicks increment
CREATE OR REPLACE FUNCTION public.increment_analytics_clicks_count(
  p_session_id text,
  p_count int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visits
  SET clicks = COALESCE(clicks, 0) + p_count
  WHERE session_id = p_session_id;
END;
$$;

-- 9. Ensure transactions table exists with proper structure
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text CHECK (type IN ('payment', 'refund', 'earning', 'withdrawal', 'deposit')),
    description text,
    reference text,
    related_submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Service role can manage transactions" ON public.transactions;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions" ON public.transactions
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Ensure support tables exist
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Ensure analytics_visits table exists
CREATE TABLE IF NOT EXISTS public.analytics_visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL,
    ip_address text,
    user_agent text,
    country text,
    path text,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    page_views int DEFAULT 1,
    clicks int DEFAULT 0,
    duration_seconds int DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Ensure broadcasts table exists
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL,
    message text NOT NULL,
    target_role text DEFAULT 'all',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Ensure submissions has tracking columns
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS tracking_slug text UNIQUE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS clicks int DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ranking_boosted_at timestamp with time zone;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS feedback text;

-- 14. Ensure profiles has all needed columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_docs text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nin_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;

-- 15. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_artist_id ON public.submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_submissions_playlist_id ON public.submissions(playlist_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_slug ON public.submissions(tracking_slug);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_playlists_curator_id ON public.playlists(curator_id);

-- Success!
SELECT '✅ AfroPitch database migration complete!' as result;

-- ============================================
-- ADDITIONAL TABLES: Inbound Emails & System Logs
-- ============================================

-- Inbound email storage (Resend webhook)
CREATE TABLE IF NOT EXISTS public.inbound_emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL DEFAULT '',
    body_text text DEFAULT '',
    body_html text DEFAULT '',
    message_id text,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    status text DEFAULT 'received' CHECK (status IN ('received', 'read', 'replied', 'archived')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_id ON public.inbound_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from_email ON public.inbound_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON public.inbound_emails(status);

-- System logs (used by admin email APIs, analytics)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- Notifications table (used by curator verification notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Withdrawals table (if not exists)
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    bank_name text,
    account_number text,
    account_name text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- Curator applications table
CREATE TABLE IF NOT EXISTS public.curator_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    portfolio text,
    experience text,
    genres text,
    reason text,
    phone text,
    id_document text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin top-up RPC function
CREATE OR REPLACE FUNCTION public.admin_top_up_user(
    p_user_id uuid,
    p_amount numeric,
    p_description text DEFAULT 'Admin Top Up'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Amount must be positive');
    END IF;

    UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_amount, 'deposit', p_description);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Reject withdrawal RPC
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
    p_withdrawal_id uuid,
    p_reason text DEFAULT 'Rejected by Admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wd record;
BEGIN
    SELECT * INTO v_wd FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Withdrawal not found');
    END IF;

    -- Refund to user wallet
    UPDATE public.profiles SET balance = balance + v_wd.amount WHERE id = v_wd.user_id;

    -- Update withdrawal status
    UPDATE public.withdrawals SET status = 'rejected' WHERE id = p_withdrawal_id;

    -- Record refund transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (v_wd.user_id, v_wd.amount, 'refund', 'Withdrawal rejected: ' || p_reason);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Get top playlists by clicks RPC
CREATE OR REPLACE FUNCTION public.get_top_playlists_by_clicks(limit_count int DEFAULT 5)
RETURNS TABLE(playlist_id uuid, playlist_name text, curator_name text, total_clicks bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id AS playlist_id, p.name AS playlist_name,
           COALESCE(pro.full_name, 'Unknown') AS curator_name,
           COALESCE(SUM(s.clicks), 0)::bigint AS total_clicks
    FROM public.playlists p
    LEFT JOIN public.profiles pro ON p.curator_id = pro.id
    LEFT JOIN public.submissions s ON s.playlist_id = p.id
    GROUP BY p.id, p.name, pro.full_name
    ORDER BY total_clicks DESC
    LIMIT limit_count;
END;
$$;

-- Increment clicks RPC
CREATE OR REPLACE FUNCTION public.increment_submission_clicks(submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.submissions
    SET clicks = COALESCE(clicks, 0) + 1
    WHERE id = submission_id;
END;
$$;

SELECT '✅ AfroPitch database migration complete (extended)!' as result;
