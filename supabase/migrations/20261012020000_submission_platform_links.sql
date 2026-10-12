-- Fan page platform links: Deezer + YouTube Music alongside the existing
-- Spotify (song_link), Apple Music, Audiomack and Boomplay columns.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS deezer_url text,
  ADD COLUMN IF NOT EXISTS youtube_music_url text;
