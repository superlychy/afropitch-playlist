-- Featured artist: optional photo with song cover-art fallback
alter table public.featured_artists
  add column if not exists cover_art_url text;
