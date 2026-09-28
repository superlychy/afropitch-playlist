-- Add an optional credits/comment field to showcase songs
-- (producer name, contributors, liner notes…).
alter table public.mixed_songs
  add column if not exists comment text;
