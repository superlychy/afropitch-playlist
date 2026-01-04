-- Enable pg_net extension for HTTP requests
create extension if not exists pg_net;

-- Create the notification trigger function
create or replace function public.notify_user_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
  request_id bigint;
begin
  payload = jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
  );

  -- Perform the HTTP request to the Edge Function
  -- Uses the provided ANON KEY for authorization
  select net.http_post(
      url := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-user',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDIzOTEsImV4cCI6MjA4MjI3ODM5MX0.9x7utKiltdD8zzwWWi_8D2PTW0Y17Pi9dHQ5eTnX7fg'
      ),
      body := payload
  ) into request_id;

  return NEW;
end;
$$;

-- 1. Transactions Trigger (INSERT only)
drop trigger if exists on_transaction_created on public.transactions;
create trigger on_transaction_created
  after insert on public.transactions
  for each row execute function public.notify_user_webhook();

-- 2. Submissions Trigger (UPDATE only)
drop trigger if exists on_submission_updated on public.submissions;
create trigger on_submission_updated
  after update on public.submissions
  for each row execute function public.notify_user_webhook();

-- 3. Withdrawals Trigger (UPDATE only)
drop trigger if exists on_withdrawal_updated on public.withdrawals;
create trigger on_withdrawal_updated
  after update on public.withdrawals
  for each row execute function public.notify_user_webhook();

-- 4. Support Tickets Trigger (UPDATE only)
drop trigger if exists on_ticket_updated on public.support_tickets;
create trigger on_ticket_updated
  after update on public.support_tickets
  for each row execute function public.notify_user_webhook();
