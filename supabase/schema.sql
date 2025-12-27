-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Public user data)
create table public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  role text check (role in ('artist', 'curator', 'admin')) default 'artist',
  balance numeric default 0,
  bio text,
  instagram text,
  twitter text,
  website text,
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.profiles enable row level security;
-- Allow read for everyone
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
-- Allow update for self
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- 2. PLAYLISTS TABLE
create table public.playlists (
  id uuid default uuid_generate_v4() primary key,
  curator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  genre text not null,
  followers int default 0,
  description text,
  playlist_link text, -- External link to playlist (Spotify/Apple)
  cover_image text, -- CSS class or URL
  submission_fee numeric default 0,
  type text check (type in ('regular', 'exclusive')) default 'regular',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.playlists enable row level security;
create policy "Playlists are viewable by everyone." on public.playlists for select using (true);
create policy "Curators can insert playlists." on public.playlists for insert with check (auth.uid() = curator_id);
create policy "Curators can update own playlists." on public.playlists for update using (auth.uid() = curator_id);

-- 3. SUBMISSIONS TABLE
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  artist_id uuid references public.profiles(id) on delete cascade not null,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  song_title text not null,
  artist_name text not null,
  song_link text not null,
  tier text check (tier in ('standard', 'express', 'exclusive')) default 'standard',
  amount_paid numeric not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  feedback text,
  tracking_slug text,
  clicks int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.submissions enable row level security;
create policy "Artists can view own submissions" on public.submissions for select using (auth.uid() = artist_id);
create policy "Curators can view submissions for their playlists" on public.submissions for select using (
  exists (select 1 from public.playlists where id = submissions.playlist_id and curator_id = auth.uid())
);
create policy "Artists can insert submissions" on public.submissions for insert with check (auth.uid() = artist_id);
create policy "Curators can update submissions" on public.submissions for update using (
  exists (select 1 from public.playlists where id = submissions.playlist_id and curator_id = auth.uid())
);


-- SEED DATA (MOCK DATA REPLACEMENT)
-- Note: In a real scenario, profile IDs must match referencing auth.users.id. 
-- Since we can't seed auth.users from here easily with known passwords, 
-- we will insert placeholder profiles that might NOT allow login but will serve for display.

-- Insert Mock Curators
insert into public.profiles (id, email, full_name, role, bio, verified, instagram, twitter, website)
values 
  ('11111111-1111-1111-1111-111111111111', 'lagos@vibes.com', 'Lagos Vibes Team', 'curator', 'We curate the hottest sounds coming out of Lagos.', true, 'lagosvibes', 'lagosvibes_ng', 'https://lagosvibes.com'),
  ('22222222-2222-2222-2222-222222222222', 'piano@central.com', 'Amapiano Central', 'curator', 'Strictly Piano. If it doesn''t verify the log drum, we don''t want it.', true, 'amapianocentral', null, 'https://amapiano.co.za'),
  ('33333333-3333-3333-3333-333333333333', 'afro@pop.com', 'Afro-Pop Daily', 'curator', 'Daily updates of the freshest Afro-Pop melodies.', false, null, null, null);

-- Insert Playlists
insert into public.playlists (curator_id, name, genre, followers, description, cover_image, submission_fee, type)
values
  ('11111111-1111-1111-1111-111111111111', 'Naija Party 101', 'Afrobeats', 15400, 'The ultimate party starter pack.', 'bg-green-600', 3000, 'regular'),
  ('11111111-1111-1111-1111-111111111111', 'Alté Cruise', 'Afro-Fusion', 8200, 'For the cool kids. Smooth vibes only.', 'bg-purple-600', 0, 'regular'),
  
  ('22222222-2222-2222-2222-222222222222', 'Piano to the World', 'Amapiano', 45000, 'Global Amapiano hits.', 'bg-orange-500', 7000, 'exclusive'),
  ('22222222-2222-2222-2222-222222222222', 'Private School Piano', 'Amapiano', 12000, 'Deep, soulful, and exclusive.', 'bg-yellow-600', 3000, 'regular'),

  ('33333333-3333-3333-3333-333333333333', 'Afro Love', 'Afro-Pop', 25000, 'Love songs and heartbreak anthems.', 'bg-pink-600', 0, 'regular');

