
-- Helper function to check admin role securely and avoid recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public -- Secure search path
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Drop insecure/recursive policy
drop policy if exists "Admins can update any profile" on public.profiles;

-- Create new non-recursive policy
create policy "Admins can update any profile"
on public.profiles
for update
using ( is_admin() );
