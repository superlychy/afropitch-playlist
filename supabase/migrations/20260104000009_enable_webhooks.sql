-- Enable pg_net extension
create extension if not exists pg_net;

-- Create Webhook Function
create or replace function public.notify_user_webhook()
returns trigger as $$
declare
  payload jsonb;
  url text := 'https://gildytqinnntmtvbagxm.supabase.co/functions/v1/notify-user';
  api_key text := 'SERVICE_ROLE_KEY'; -- REPLACE WITH YOUR KEY OR USE VAULT
begin
  payload = jsonb_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  perform net.http_post(
    url := url,
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || api_key
    ),
    body := payload
  );

  return new;
end;
$$ language plpgsql security definer;

-- Triggers

-- 1. Broadcasts (INSERT)
drop trigger if exists on_broadcast_insert on public.broadcasts;
create trigger on_broadcast_insert
after insert on public.broadcasts
for each row execute function public.notify_user_webhook();

-- 2. Transactions (INSERT)
drop trigger if exists on_transaction_insert on public.transactions;
create trigger on_transaction_insert
after insert on public.transactions
for each row execute function public.notify_user_webhook();

-- 3. Submissions (UPDATE)
drop trigger if exists on_submission_update on public.submissions;
create trigger on_submission_update
after update on public.submissions
for each row execute function public.notify_user_webhook();

-- 4. Withdrawals (UPDATE)
drop trigger if exists on_withdrawal_update on public.withdrawals;
create trigger on_withdrawal_update
after update on public.withdrawals
for each row execute function public.notify_user_webhook();

-- 5. Support Tickets (UPDATE)
drop trigger if exists on_ticket_update on public.support_tickets;
create trigger on_ticket_update
after update on public.support_tickets
for each row execute function public.notify_user_webhook();
