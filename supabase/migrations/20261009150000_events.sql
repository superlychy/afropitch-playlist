-- AfroPitch events (phase 1: discovery listing).
-- Public /events page + per-event detail pages, admin-curated.
-- NOTE: do NOT apply to production without Max's approval. Reviewed on preview first.

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  venue text,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'Nigeria',
  image_url text,
  description text,
  ticket_url text,
  organizer text,
  category text NOT NULL DEFAULT 'concert'
    CHECK (category IN ('concert', 'festival', 'awards', 'industry', 'competition')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  source text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT events_ends_after_starts CHECK (ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_events_status_starts
  ON public.events (status, starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published events" ON public.events;
CREATE POLICY "Public can view published events"
  ON public.events FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Traction metrics: page views + ticket-link clicks per event.
-- Insert-only from the public side; reads are admin-only (future dashboard).
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('view', 'ticket_click')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_event_analytics_event_kind
  ON public.event_analytics (event_id, kind);

ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log event analytics" ON public.event_analytics;
CREATE POLICY "Anyone can log event analytics"
  ON public.event_analytics FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read event analytics" ON public.event_analytics;
CREATE POLICY "Admins can read event analytics"
  ON public.event_analytics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
