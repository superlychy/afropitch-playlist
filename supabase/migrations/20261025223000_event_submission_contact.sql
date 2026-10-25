-- Public event submission form: record who submitted each listing.
-- Additive only, nullable, no behaviour change for existing rows.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submitted_by_name text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submitted_by_email text;
-- New columns do not inherit column grants, so grant explicitly.
GRANT SELECT (submitted_by_name, submitted_by_email) ON public.events TO authenticated;
