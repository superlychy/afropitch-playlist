-- Update playlists type check constraint to include 'express'
alter table public.playlists drop constraint if exists playlists_type_check;
alter table public.playlists add constraint playlists_type_check check (type in ('free', 'standard', 'express', 'exclusive'));
