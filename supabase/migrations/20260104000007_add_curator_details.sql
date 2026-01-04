
-- Add banking details and verification status to profiles
alter table public.profiles 
add column if not exists bank_name text,
add column if not exists account_number text,
add column if not exists account_name text,
add column if not exists verification_status text default 'none' check (verification_status in ('none', 'pending', 'verified', 'rejected')),
add column if not exists verification_docs text; -- URL or JSON of submitted docs
