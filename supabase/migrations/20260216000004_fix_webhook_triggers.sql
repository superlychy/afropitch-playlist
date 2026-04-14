-- Migration: Fix Webhook Triggers and Prevent Duplicate Emails
-- Created: 2026-02-16
-- Purpose: 
--   1. Add missing transactions trigger for notify-user webhook
--   2. Remove duplicate admin webhook triggers
--   3. Ensure submissions UPDATE trigger is working

-- ============================================================================
-- 1. ENSURE notify_user_webhook FUNCTION IS CORRECT
-- ============================================================================

-- This function should already be correct from migration 20260213000003
-- But let's verify it has the correct anon key
CREATE OR REPLACE FUNCTION public.notify_user_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  request_id bigint;
  api_key text := 'YOUR_SUPABASE_KEY';
  url text := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-user';
BEGIN
  payload = jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Perform the HTTP request
  SELECT net.http_post(
      url := url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || api_key
      ),
      body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. REMOVE DUPLICATE ADMIN WEBHOOK TRIGGERS ON TRANSACTIONS
-- ============================================================================

-- The admin webhook on transactions is causing duplicate emails
-- We only need the notify-user webhook for transactions
DROP TRIGGER IF EXISTS on_transaction_created_admin ON public.transactions;

-- ============================================================================
-- 3. ENSURE USER NOTIFICATION TRIGGERS ARE CORRECT
-- ============================================================================

-- Broadcasts (INSERT)
DROP TRIGGER IF EXISTS on_broadcast_insert ON public.broadcasts;
CREATE TRIGGER on_broadcast_insert
  AFTER INSERT ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();

-- Transactions (INSERT) - THIS WAS MISSING!
DROP TRIGGER IF EXISTS on_transaction_insert ON public.transactions;
CREATE TRIGGER on_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();

-- Submissions (UPDATE)
DROP TRIGGER IF EXISTS on_submission_update ON public.submissions;
DROP TRIGGER IF EXISTS on_submission_updated ON public.submissions;
CREATE TRIGGER on_submission_update
  AFTER UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();

-- Withdrawals (UPDATE)
DROP TRIGGER IF EXISTS on_withdrawal_update ON public.withdrawals;
DROP TRIGGER IF EXISTS on_withdrawal_updated ON public.withdrawals;
CREATE TRIGGER on_withdrawal_update
  AFTER UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();

-- Support Tickets (UPDATE)
DROP TRIGGER IF EXISTS on_ticket_update ON public.support_tickets;
DROP TRIGGER IF EXISTS on_ticket_updated ON public.support_tickets;
CREATE TRIGGER on_ticket_update
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();

-- ============================================================================
-- 4. VERIFY SUBMISSION INSERT TRIGGER FOR CURATOR NOTIFICATION
-- ============================================================================

-- This trigger notifies curator when artist submits a song
-- It should already exist from previous migrations
-- Just verify it's there (no need to recreate if it exists)

-- Note: We're NOT removing the admin webhook for submissions INSERT
-- because curators need to be notified of new submissions
