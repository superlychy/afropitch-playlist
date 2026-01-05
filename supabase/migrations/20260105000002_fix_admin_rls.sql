
-- Policy to allow Admins to update verification_status of any profile
create policy "Admins can update any profile"
on public.profiles
for update
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
