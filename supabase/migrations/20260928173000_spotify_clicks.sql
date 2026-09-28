-- Outbound Spotify click tracking (2026-09-28)
--
-- The Spotify playlist-management system needs per-song/per-playlist click
-- counts from afropitchplay.best (the "zero clicks during trial" rule).
-- Clicks are logged by /api/go/spotify, which validates the destination
-- and 302-redirects. Iframes (Spotify embeds) cannot be tracked; only the
-- explicit "Listen on Spotify" buttons route through the logger.

create table if not exists public.spotify_clicks (
  id uuid primary key default gen_random_uuid(),
  clicked_at timestamptz not null default now(),
  url text not null,
  kind text not null,          -- 'playlist' | 'track'
  ref_id text,                 -- playlist id or mixed-song id
  source text,                 -- referer page, when available
  user_id uuid                 -- null for logged-out visitors
);

alter table public.spotify_clicks enable row level security;

drop policy if exists "Anyone can log a click" on public.spotify_clicks;
create policy "Anyone can log a click"
  on public.spotify_clicks for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read clicks" on public.spotify_clicks;
create policy "Admins can read clicks"
  on public.spotify_clicks for select
  using (public.is_admin());

create index if not exists spotify_clicks_lookup
  on public.spotify_clicks (kind, ref_id, clicked_at desc);
