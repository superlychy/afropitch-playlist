-- Push notification device tokens for the native AfroPitch app (FCM).
-- Tokens are registered by the app after login; fan-out reads them on new notifications.

create table if not exists public.push_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    token text not null unique,
    platform text not null default 'android',
    app_version text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Users manage only their own tokens. The service role (fan-out) bypasses RLS.
drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
    on public.push_tokens for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Fan-out: on every new in-app notification, POST its id to the push fan-out
-- endpoint, which delivers via FCM to the user's registered app tokens.
-- __PUSH_FANOUT_SECRET__ is replaced with the real secret (matching the
-- PUSH_FANOUT_SECRET env var on Vercel) at apply time.

create or replace function public.fanout_push_notification()
returns trigger
language plpgsql
security definer
as $$
begin
    perform supabase_functions.http_request(
        'https://afropitchplay.best/api/push/fanout',
        'POST',
        '{"Content-Type":"application/json","x-push-secret":"__PUSH_FANOUT_SECRET__"}',
        json_build_object('notification_id', NEW.id)::text,
        '5000'
    );
    return NEW;
exception when others then
    -- Never let a push failure break the notification insert.
    return NEW;
end;
$$;

drop trigger if exists notify_push_on_notification on public.notifications;
create trigger notify_push_on_notification
    after insert on public.notifications
    for each row
    execute function public.fanout_push_notification();
