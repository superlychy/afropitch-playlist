-- Let logged-in admins create and delete events from the dashboard.
-- The "Admins can manage events" RLS policy already restricts every command
-- to profiles with role = 'admin', so this grant stays admin-only in
-- practice; it only repairs the missing table-level permission that made
-- dashboard creates fail (only service_role could INSERT/DELETE before).
GRANT INSERT, DELETE ON public.events TO authenticated;
