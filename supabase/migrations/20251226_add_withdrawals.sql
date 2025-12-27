-- 4. WITHDRAWALS TABLE
create table if not exists public.withdrawals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  status text check (status in ('pending', 'approved', 'rejected', 'processed')) default 'pending',
  bank_name text,
  account_number text,
  account_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.withdrawals enable row level security;
create policy "Users can view own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);
create policy "Users can insert withdrawals" on public.withdrawals for insert with check (auth.uid() = user_id);

-- Ensure profiles have social columns if not already (safeguard)
-- Note: schema.sql already had them, but just in case user meant 'add if missing'
-- alter table public.profiles add column if not exists instagram text; 
-- alter table public.profiles add column if not exists twitter text;
-- alter table public.profiles add column if not exists website text;
-- alter table public.profiles add column if not exists bio text;
