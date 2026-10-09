-- Email reminders for events (follows an "Interested" vote).
-- Applied live 2026-10-09 per Max's approval.

CREATE TABLE IF NOT EXISTS public.event_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    email text NOT NULL,
    voter_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    UNIQUE(event_id, voter_key)
);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS event_reminders_due_idx
    ON public.event_reminders(sent_at) WHERE sent_at IS NULL;
