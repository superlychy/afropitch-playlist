-- Notify on registered-curator verification decisions (email parity with external-applicant flow).
-- The notify-user edge function ignores unknown tables, so creating this trigger before the
-- function deploys is safe.

DROP TRIGGER IF EXISTS notify_profiles_verification_update ON public.profiles;

CREATE TRIGGER notify_profiles_verification_update
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (
    OLD.verification_status IS DISTINCT FROM NEW.verification_status
    AND NEW.role = 'curator'
)
EXECUTE FUNCTION public.notify_user_webhook();

-- Tighten protect_sensitive_profile_columns: a non-admin may only move their own
-- verification_status TO 'pending' from 'none' or 'rejected' (first apply / re-apply).
-- A verified curator can no longer demote themselves to 'pending' via direct API call.

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
