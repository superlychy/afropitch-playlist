-- Fix the notify_user_webhook function to use the correct Anon Key
-- This restores the functionality broken by migration 09 which had a placeholder key
-- and ensures the broadcast trigger is active.

create extension if not exists pg_net;

create or replace function public.notify_user_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
  request_id bigint;
  -- Verified Anon Key from initial setup
  api_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDIzOTEsImV4cCI6MjA4MjI3ODM5MX0.9x7utKiltdD8zzwWWi_8D2PTW0Y17Pi9dHQ5eTnX7fg';
  url text := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-user';
begin
  payload = jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
  );

  -- Perform the HTTP request
  select net.http_post(
      url := url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || api_key
      ),
      body := payload
  ) into request_id;

  return NEW;
end;
$$;

-- Ensure Trigger exists for Broadcasts
drop trigger if exists on_broadcast_insert on public.broadcasts;
create trigger on_broadcast_insert
  after insert on public.broadcasts
  for each row execute function public.notify_user_webhook();

-- Ensure other triggers are intact (re-applying to be safe)
drop trigger if exists on_submission_updated on public.submissions;
create trigger on_submission_updated
  after update on public.submissions
  for each row execute function public.notify_user_webhook();

drop trigger if exists on_withdrawal_updated on public.withdrawals;
create trigger on_withdrawal_updated
  after update on public.withdrawals
  for each row execute function public.notify_user_webhook();

drop trigger if exists on_ticket_updated on public.support_tickets;
create trigger on_ticket_updated
  after update on public.support_tickets
  for each row execute function public.notify_user_webhook();
