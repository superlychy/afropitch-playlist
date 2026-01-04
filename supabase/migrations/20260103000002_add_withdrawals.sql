-- WITHDRAWALS TABLE
create table if not exists public.withdrawals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  bank_name text,
  account_number text,
  account_name text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.withdrawals enable row level security;

-- Drop policies if they exist to avoid conflict errors
drop policy if exists "Users can view own withdrawals" on public.withdrawals;
drop policy if exists "Users can insert withdrawals" on public.withdrawals;

-- Re-create policies
create policy "Users can view own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);
create policy "Users can insert withdrawals" on public.withdrawals for insert with check (auth.uid() = user_id);
