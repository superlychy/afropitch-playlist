
-- Empty the broadcasts table to start fresh
delete from public.broadcasts;

-- Create notifications table if it doesn't exist (assuming user meant 'notifications' for welcome message)
-- But user might just rely on 'broadcasts' but scoped to specific users.
-- Actually the 'broadcasts' table is 'one-to-many'.
-- If we want a PERSONAL welcome message, we usually insert into a 'notifications' table.
-- Let's check if 'notifications' table exists.
-- I'll try create it.

create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    title text not null,
    message text not null,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

-- Only system/functions can insert (or admins if needed)
create policy "Admins can insert notifications"
    on public.notifications for insert
    with check (
        exists (
             select 1 from public.profiles
             where profiles.id = auth.uid()
             and profiles.role = 'admin'
        )
    );
-- But trigger needs to run as security definer usually.

-- Create Trigger Function for Welcome Message
create or replace function public.handle_new_user_welcome()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Check role
    if new.role = 'artist' then
        insert into public.notifications (user_id, title, message)
        values (new.id, 'Welcome to AfroPitch 1.1!', '<h3>Welcome Artist!</h3><p>We are excited to have you on board. Here is what you need to know about version 1.1: We have streamlined the submission process. You can now track your campaigns directly from your dashboard.</p><p>Get started by pitching your first track!</p>');
    elsif new.role = 'curator' then
        insert into public.notifications (user_id, title, message)
        values (new.id, 'Welcome to AfroPitch 1.1!', '<h3>Welcome Curator!</h3><p>Thanks for joining our curation team. Version 1.1 brings new tools for managing your playlists and earnings.</p><p>Please verify your profile to start receiving submissions.</p>');
    end if;
    return new;
end;
$$;

-- Trigger
drop trigger if exists on_profile_created_welcome on public.profiles;
create trigger on_profile_created_welcome
    after insert on public.profiles
    for each row
    execute function public.handle_new_user_welcome();

