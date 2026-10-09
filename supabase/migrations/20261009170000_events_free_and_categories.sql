-- Events refinements: free-entry flag + extra categories.
-- Applied live 2026-10-09 per Max's approval (categories + free handling).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE public.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('concert','festival','awards','industry','competition','party','tour','showcase'));
