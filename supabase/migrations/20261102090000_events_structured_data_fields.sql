-- Structured data fields for event pages, fixing the three non-critical
-- Search Console issues: organizer url, offers price, offers priceCurrency.
-- All columns are optional and left null unless the value is verified.
-- Currency follows the event country, never NGN by default: the admin field
-- is authoritative when set, otherwise the page falls back to a country
-- currency map in code, otherwise no currency is emitted.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_price_min numeric;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_price_max numeric;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_currency text;

-- New columns do not inherit the table's column-level grants, so grant
-- them explicitly: public reads for the event page, edits for logged-in admins.
GRANT SELECT (organizer_url, ticket_price_min, ticket_price_max, ticket_currency) ON public.events TO anon, authenticated;
GRANT UPDATE (organizer_url, ticket_price_min, ticket_price_max, ticket_currency) ON public.events TO authenticated;
