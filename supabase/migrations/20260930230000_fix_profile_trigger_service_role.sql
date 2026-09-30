-- Fix protect_sensitive_profile_columns: restore the service_role/postgres
-- bypass that 20260928180000 accidentally dropped when it redefined the
-- function as SECURITY DEFINER.
--
-- Background: 20260928170000 created this trigger as SECURITY INVOKER with
-- `IF current_user IN ('service_role','postgres') THEN RETURN NEW;` so that
-- server-side writers (service_role API routes, SECURITY DEFINER RPCs) could
-- move money. 20260928180000 redefined it as SECURITY DEFINER without the
-- bypass. Consequence on the live DB: inside a SECURITY DEFINER function
-- current_user is always the owner, and is_admin() is false for service_role
-- (no user JWT), so EVERY service_role UPDATE of profiles.balance raised
-- 'Not allowed to change balance' -- breaking paid submissions and any
-- future referral-balance movement.
--
-- This restores the intended model (SECURITY INVOKER + trusted-writer bypass)
-- keeps the tighter 20260928180000 checks, and also protects the new
-- referral_balance column the same way as balance.

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER on purpose: current_user must reflect the actual executor
-- (authenticated/anon via PostgREST, postgres inside SECURITY DEFINER RPCs,
-- service_role for server-side API routes).
SET search_path = public
AS $$
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

        IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
            RAISE EXCEPTION 'Not allowed to change is_blocked';
        END IF;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Not allowed to change email';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sensitive_profile_columns ON public.profiles;
CREATE TRIGGER protect_sensitive_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_columns();
