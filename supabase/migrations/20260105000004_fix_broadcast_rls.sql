
-- Allow all authenticated users to view broadcasts
-- This fixes the issue where artists/curators couldn't see in-app notifications
create policy "Authenticated users can view broadcasts"
on public.broadcasts
for select
to authenticated
using (true);
