-- Protect sensitive profile columns from self-editing (2026-09-28)
--
-- Background: the RLS policy "Users can update own profile." allows any
-- authenticated user to UPDATE every column of their own profiles row,
-- including role, balance, verification_status, is_blocked and email.
-- That means any logged-in user could make themselves an admin, give
-- themselves any balance, or self-verify as a curator, straight through
-- the anon-key API. This trigger closes that hole while preserving every
-- legitimate flow:
--   * users editing their own profile fields (name, bio, socials, bank details)
--   * the one-time /welcome role choice for new Google users (artist -> artist/curator)
--   * curators (re)submitting verification docs (-> 'pending')
--   * admins changing anything via the dashboard (JWT role = admin)
--   * server-side writers: service_role API routes and SECURITY DEFINER RPCs
--     (which run as postgres)

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER on purpose: current_user must reflect the actual executor
-- (authenticated/anon via PostgREST, postgres inside SECURITY DEFINER RPCs,
-- service_role for server-side API routes).
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

  -- Role: frozen, except the one-time welcome choice for new OAuth users
  -- (the handle_new_user trigger defaults role to 'artist').
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT (OLD.role = 'artist' AND NEW.role IN ('artist', 'curator')) THEN
    RAISE EXCEPTION 'Role changes require an administrator';
  END IF;

  -- Balance: never user-editable (money moves through RPCs/webhooks only).
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Balance is updated automatically and cannot be edited';
  END IF;

  -- Verification: users may only (re)submit for review, never self-verify.
  -- The public /curators directory only lists verification_status = 'verified'.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'Verification status is set by administrators';
  END IF;

  -- Block flag and email are admin/system managed.
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email cannot be changed here';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_sensitive_profile_columns ON public.profiles;
CREATE TRIGGER protect_sensitive_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_columns();
