-- Create table for curator applications
create table if not exists public.curator_applications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  bio text,
  playlist_link text not null,
  social_links jsonb default '{}'::jsonb,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  user_id uuid references auth.users(id) -- Optional, if they are already logged in
);

-- Enable RLS
alter table public.curator_applications enable row level security;

-- Policy: Allow anyone (even anon) to submit an application
create policy "Allow public insert application"
  on public.curator_applications
  for insert
  with check (true);

-- Policy: Only admins can view applications (or self if user_id is set)
create policy "Admins view all applications"
  on public.curator_applications
  for select
  using (
    auth.role() = 'service_role' OR
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
