
-- Add avatar_url to profiles
alter table public.profiles 
add column if not exists avatar_url text;
