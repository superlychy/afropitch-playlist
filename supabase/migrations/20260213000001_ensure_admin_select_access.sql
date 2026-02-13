-- Ensure admins have full access to view all profiles
-- This is a safety policy in case the "viewable by everyone" policy isn't working

-- First, let's ensure the is_admin function exists (it should from previous migration)
-- If not, create it
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- (Removed recursive policy: "Admins can view all profiles" on profiles)
-- The existing policy "Public profiles are viewable by everyone" (true) is sufficient
-- and safer to avoid recursion loops.

-- Also ensure admins can view all withdrawals
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
USING ( is_admin() );

-- Ensure admins can view all support tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING ( is_admin() );

-- Ensure admins can view all submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
CREATE POLICY "Admins can view all submissions"
ON public.submissions
FOR SELECT
USING ( is_admin() );
