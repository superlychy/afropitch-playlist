-- Optional lineup (comma-separated acts) on events, used for the Schema.org
-- performer field on event pages. Left null unless the acts are known.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lineup text;

-- The new column does not inherit the table's column-level grants, so grant
-- it explicitly: public reads for the event page, edits for logged-in admins.
GRANT SELECT (lineup) ON public.events TO anon, authenticated;
GRANT UPDATE (lineup) ON public.events TO authenticated;
