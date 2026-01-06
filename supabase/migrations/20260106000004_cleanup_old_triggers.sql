-- Drop old pg_net triggers to avoid conflicts with Dashboard Webhooks

drop trigger if exists on_profile_change_admin on public.profiles;
drop trigger if exists on_submission_created_admin on public.submissions;
drop trigger if exists on_playlist_created_admin on public.playlists;
drop trigger if exists on_transaction_created_admin on public.transactions;
drop trigger if exists on_ticket_created_admin on public.support_tickets;

-- Drop verify function
drop function if exists public.trigger_notify_admin();
