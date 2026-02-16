-- Migration: Fix Notifications, Add Online Tracking, and Improve Admin Dashboard
-- Created: 2026-02-16
-- Purpose: Resolve notification issues, add user online status, and enhance admin visibility

-- ============================================================================
-- 1. ADD ONLINE STATUS TRACKING TO PROFILES
-- ============================================================================

-- Add last_seen_at column to track when users were last active
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT timezone('utc'::text, now());

-- Create index for efficient online user queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at DESC);

-- ============================================================================
-- 2. ADD LOGIN NOTIFICATION TRIGGER
-- ============================================================================

-- Create function to notify admin on user login
CREATE OR REPLACE FUNCTION public.notify_admin_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile record;
BEGIN
  -- Get user profile information
  SELECT id, email, full_name, role, created_at
  INTO user_profile
  FROM public.profiles
  WHERE id = NEW.id;

  -- Only notify if this is an actual login (not just a token refresh)
  IF NEW.last_sign_in_at IS NOT NULL AND 
     (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
    
    -- Call the notify-admin edge function
    PERFORM net.http_post(
      url := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-admin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMjM5MSwiZXhwIjoyMDgyMjc4MzkxfQ.L37HsKmzmvxUh1r8r5dYrRuy8i50akMfd5hpWOcv5ms'
      ),
      body := jsonb_build_object(
        'event_type', 'USER_LOGIN',
        'user_data', jsonb_build_object(
          'id', user_profile.id,
          'email', user_profile.email,
          'full_name', user_profile.full_name,
          'role', user_profile.role,
          'is_new_user', (NEW.last_sign_in_at = user_profile.created_at)
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create trigger on auth.users for login events
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_login();

-- ============================================================================
-- 3. ADD SUBMISSION TRACKING ENHANCEMENTS
-- ============================================================================

-- Add admin_notified_at column to submissions to track if admin was notified
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

-- Add reviewed_at column to track when submission was reviewed
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Update reviewed_at when status changes
CREATE OR REPLACE FUNCTION public.update_submission_reviewed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.reviewed_at = timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_submission_status_change ON public.submissions;

CREATE TRIGGER on_submission_status_change
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_submission_reviewed_at();

-- ============================================================================
-- 4. ADD WITHDRAWAL TRACKING ENHANCEMENTS
-- ============================================================================

-- Add processed_at column to withdrawals
ALTER TABLE public.withdrawals
ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Add processed_by column to track which admin processed it
ALTER TABLE public.withdrawals
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id);

-- Update processed_at when status changes to approved/rejected
CREATE OR REPLACE FUNCTION public.update_withdrawal_processed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.processed_at = timezone('utc'::text, now());
    NEW.processed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_withdrawal_status_change ON public.withdrawals;

CREATE TRIGGER on_withdrawal_status_change
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_withdrawal_processed_at();

-- ============================================================================
-- 5. CREATE FUNCTION TO GET ONLINE USER COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_online_user_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  online_count integer;
BEGIN
  SELECT COUNT(*)
  INTO online_count
  FROM public.profiles
  WHERE last_seen_at > NOW() - INTERVAL '5 minutes';
  
  RETURN online_count;
END;
$$;

-- ============================================================================
-- 6. ADD LOGGING TABLE FOR CRITICAL EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  event_type text NOT NULL,
  event_data jsonb,
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view system logs"
  ON public.system_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. CREATE FUNCTION TO LOG EVENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.system_logs (event_type, event_data, user_id)
  VALUES (p_event_type, p_event_data, COALESCE(p_user_id, auth.uid()))
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- ============================================================================
-- 8. UPDATE EXISTING TRIGGERS TO LOG EVENTS
-- ============================================================================

-- Log submission events
CREATE OR REPLACE FUNCTION public.log_submission_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_event(
      'submission_created',
      jsonb_build_object(
        'submission_id', NEW.id,
        'artist_id', NEW.artist_id,
        'playlist_id', NEW.playlist_id,
        'amount_paid', NEW.amount_paid,
        'tier', NEW.tier
      ),
      NEW.artist_id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    PERFORM public.log_event(
      'submission_status_changed',
      jsonb_build_object(
        'submission_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'artist_id', NEW.artist_id
      ),
      NEW.artist_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_submission_events ON public.submissions;

CREATE TRIGGER log_submission_events
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_event();

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_online_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb, uuid) TO authenticated;
