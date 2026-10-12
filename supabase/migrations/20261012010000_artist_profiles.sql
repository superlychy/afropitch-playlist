-- Artist fan pages: profile enrichment for the public artist page + feature readiness.
-- Adds photo, extra social handles, feature Q&A answers, and a public slug.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS feature_answers jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_slug text;

-- Slug generator: URL-safe from full_name, collision-suffixed.
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.profile_slug IS NOT NULL AND NEW.profile_slug <> '' THEN
    RETURN NEW;
  END IF;
  base := lower(regexp_replace(coalesce(NULLIF(trim(NEW.full_name), ''), split_part(NEW.email, '@', 1), 'artist'), '[^a-z0-9]+', '-', 'g'));
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  IF base = '' OR base IS NULL THEN base := 'artist'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profile_slug = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.profile_slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_slug ON public.profiles;
CREATE TRIGGER set_profile_slug
  BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_profile_slug();

-- Backfill slugs for existing profiles.
UPDATE public.profiles SET full_name = full_name WHERE profile_slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_unique
  ON public.profiles (profile_slug) WHERE profile_slug IS NOT NULL;

-- Public bucket for artist profile photos.
-- Uploads go through /api/artist/upload-photo (service role validates the session):
-- no direct public writes. Anyone can read (public fan pages + SEO/social cards).
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-photos', 'artist-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view artist photos" ON storage.objects;
CREATE POLICY "Public can view artist photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-photos');

-- No INSERT / UPDATE / DELETE policies: writes happen server-side only.
