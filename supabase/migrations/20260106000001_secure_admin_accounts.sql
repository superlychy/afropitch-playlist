-- Enable RLS on admin_accounts table
alter table public.admin_accounts enable row level security;

-- Create policy to allow admins to see their own account (if meaningful) or block all public access
-- Since admin_accounts is likely internal, we should block all access by default
-- and only allow specific service-role or admin access if needed.

-- POLICY 1: DENY ALL (SAFE DEFAULT for internal tables)
drop policy if exists "No public access" on public.admin_accounts;
create policy "No public access"
  on public.admin_accounts
  for all
  using (false);

-- OPTIONAL: If admin_accounts links to auth.users, allow self-read:
-- create policy "Admins can view own account"
-- on public.admin_accounts
-- for select
-- using (auth.uid() = id); 
-- (Assuming id is the auth id, check schema first. But "No public access" is safest to kill the warning).
