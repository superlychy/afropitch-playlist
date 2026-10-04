-- Curator playlist verification system.
-- app_settings: key/value store for admin-configurable values (e.g. the
--   curator verification test song link, changeable by Max in the dashboard).
-- playlists.verification_status: per-playlist verification state.
--   'unverified'     -> new playlists, challenge shown to curator
--   'pending_review' -> curator clicked Done, awaiting Max's manual check
--   'verified'       -> Max confirmed the test song on the playlist

create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Admins manage settings; curators/artists can read them.
drop policy if exists "app_settings_admin_all" on public.app_settings;
create policy "app_settings_admin_all" on public.app_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all" on public.app_settings
  for select using (true);

-- Seed the verification song link (empty until Max sets it in the dashboard).
insert into public.app_settings (key, value)
values ('curator_verification_song_url', '')
on conflict (key) do nothing;

-- Per-playlist verification status.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'playlists' and column_name = 'verification_status'
  ) then
    alter table public.playlists add column verification_status text not null default 'unverified';
  end if;
end $$;
