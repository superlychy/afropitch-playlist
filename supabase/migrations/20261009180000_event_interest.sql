-- Interested / Not interested tracking for events (traction metric).
-- Applied live 2026-10-09 per Max's approval.

CREATE TABLE IF NOT EXISTS public.event_interest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    voter_key text NOT NULL,
    value text NOT NULL CHECK (value IN ('interested','not_interested')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, voter_key)
);

ALTER TABLE public.event_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_interest_public_read ON public.event_interest;
CREATE POLICY event_interest_public_read ON public.event_interest FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS event_interest_event_id_idx ON public.event_interest(event_id);
