-- Public bucket for Featured Artist photos.
-- Uploads go through the /api/featured/upload-photo route (service role):
-- no direct public writes. Anyone can read (public site + SEO/social cards).

INSERT INTO storage.buckets (id, name, public)
VALUES ('featured-photos', 'featured-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view featured photos" ON storage.objects;
CREATE POLICY "Public can view featured photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'featured-photos');

-- No INSERT / UPDATE / DELETE policies: writes happen server-side only,
-- via the upload API route which validates the questionnaire token or
-- an admin session before using the service role.
