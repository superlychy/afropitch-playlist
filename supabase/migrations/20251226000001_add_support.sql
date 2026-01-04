-- 6. SUPPORT TICKETS
create table if not exists public.support_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  message text not null,
  status text check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Tickets
alter table public.support_tickets enable row level security;

drop policy if exists "Users can view own tickets" on public.support_tickets;
create policy "Users can view own tickets" on public.support_tickets for select using (auth.uid() = user_id);

drop policy if exists "Users can insert tickets" on public.support_tickets;
create policy "Users can insert tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
-- Admin RLS (assumes admin role checks in application logic or separate policy if robust admin role exists in auth.users)
-- ideally: create policy "Admins can view all tickets" on public.support_tickets for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- 7. SUPPORT MESSAGES (for chat)
create table if not exists public.support_messages (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null, -- could be user or admin
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.support_messages enable row level security;
drop policy if exists "Users can view messages for own tickets" on public.support_messages;
create policy "Users can view messages for own tickets" on public.support_messages for select using (
  exists (select 1 from support_tickets where id = ticket_id and user_id = auth.uid())
);
drop policy if exists "Users can insert messages for own tickets" on public.support_messages;
create policy "Users can insert messages for own tickets" on public.support_messages for insert with check (
  exists (select 1 from support_tickets where id = ticket_id and user_id = auth.uid())
);


-- 8. ADMIN LOGS (optional but requested "manage user")
-- Adding 'is_blocked' to profiles for "delete/ban user" feature without hard deleting
alter table public.profiles add column if not exists is_blocked boolean default false;
