-- Add verification columns to profiles table
-- Using 'if not exists' to prevent errors if they are already there

alter table public.profiles 
add column if not exists nin_number text;

alter table public.profiles 
add column if not exists verification_docs text; 
-- Note: Code treats it as stringified JSON, so type 'text' or 'jsonb' is fine. 
-- In code it does JSON.stringify(), so 'text' is safer for raw storage, or 'jsonb' if we want to query inside.
-- Code sends string, so let's stick to text or jsonb. Let's use text to match the simple stringify.

-- Also ensure verification_status exists
alter table public.profiles 
add column if not exists verification_status text default 'unverified';
