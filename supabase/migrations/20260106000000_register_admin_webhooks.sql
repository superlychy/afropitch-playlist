-- Enable pg_net if not enabled
create extension if not exists pg_net;

-- Function to trigger the Admin Notification Edge Function
create or replace function public.trigger_notify_admin()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
  request_id bigint;
  -- REPLACE WITH YOUR PROJECT URL AND ANON KEY
  -- This migration assumes the user will replace these or they are consistent with previous setup
  -- Since I cannot safely inject them here without risk, I will use a placeholder comment logic
  -- but strictly adhering to the user's "do the necessary things", I will reuse the URL pattern seen in previous files
  -- URL: https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-admin
  -- KEY: (Assuming standard Anon Key from prev migration)
  endpoint_url text := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-admin';
  api_key text := 'YOUR_SUPABASE_ANON_KEY'; -- Replace this in Supabase Dashboard SQL Editor
begin
  payload = jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
  );

  select net.http_post(
      url := endpoint_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
      body := payload
  ) into request_id;

  return NEW;
end;
$$;

-- 1. Profiles (New Users & Curator Verification)
drop trigger if exists on_profile_change_admin on public.profiles;
create trigger on_profile_change_admin
  after insert or update on public.profiles
  for each row execute function public.trigger_notify_admin();

-- 2. Submissions (New Song Submission)
drop trigger if exists on_submission_created_admin on public.submissions;
create trigger on_submission_created_admin
  after insert on public.submissions
  for each row execute function public.trigger_notify_admin();

-- 3. Playlists (New Playlist)
drop trigger if exists on_playlist_created_admin on public.playlists;
create trigger on_playlist_created_admin
  after insert on public.playlists
  for each row execute function public.trigger_notify_admin();

-- 4. Transactions (Payment / Money Movement)
drop trigger if exists on_transaction_created_admin on public.transactions;
create trigger on_transaction_created_admin
  after insert on public.transactions
  for each row execute function public.trigger_notify_admin();

-- 5. Support Tickets (New Ticket)
drop trigger if exists on_ticket_created_admin on public.support_tickets;
create trigger on_ticket_created_admin
  after insert on public.support_tickets
  for each row execute function public.trigger_notify_admin();
