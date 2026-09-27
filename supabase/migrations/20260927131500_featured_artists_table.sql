-- Featured artists table.
-- NOTE: this table was originally created directly on the production database
-- on 2026-09-27 (featured-artist launch, commit eb27255). This migration
-- records that schema in the repo so fresh environments stay in sync.
-- It is fully idempotent: safe to run against the existing production table.

CREATE TABLE IF NOT EXISTS public.featured_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  headline text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  slug text,
  bio text,
  qa jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  questionnaire_token text,
  questionnaire_completed_at timestamptz
);

-- Unique slugs / questionnaire tokens (only when set)
CREATE UNIQUE INDEX IF NOT EXISTS featured_artists_slug_uidx
  ON public.featured_artists (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS featured_artists_qtoken_uidx
  ON public.featured_artists (questionnaire_token) WHERE questionnaire_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_featured_artists_status
  ON public.featured_artists (status);

ALTER TABLE public.featured_artists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published features" ON public.featured_artists;
CREATE POLICY "Public can view published features"
  ON public.featured_artists FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage features" ON public.featured_artists;
CREATE POLICY "Admins can manage features"
  ON public.featured_artists FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
