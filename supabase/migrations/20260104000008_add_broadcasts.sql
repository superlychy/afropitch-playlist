create table if not exists public.broadcasts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    subject text not null,
    message text not null,
    sender_id uuid references auth.users not null,
    target_role text default 'all' check (target_role in ('all', 'artist', 'curator'))
);

-- RLS
alter table public.broadcasts enable row level security;

-- Only admins can insert
create policy "Admins can insert broadcasts"
    on public.broadcasts for insert
    with check (
        exists (
             select 1 from public.profiles
             where profiles.id = auth.uid()
             and profiles.role = 'admin'
        )
    );

-- Admins can view
create policy "Admins can view broadcasts"
    on public.broadcasts for select
    using (
        exists (
             select 1 from public.profiles
             where profiles.id = auth.uid()
             and profiles.role = 'admin'
        )
    );
