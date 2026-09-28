-- Cache Spotify-synced playlist tracks so /playlist pages serve instantly
-- and never hang waiting on Spotify. Refreshed at most every 6 hours.
alter table public.playlists add column if not exists tracks_cache jsonb;
alter table public.playlists add column if not exists tracks_synced_at timestamptz;
