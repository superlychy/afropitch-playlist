-- Help-chat v2: let visitors resume their ticket conversation in the widget.
-- A random access token per ticket lets the (possibly anonymous) visitor who
-- opened it read the thread and send follow-ups without an account.
ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS access_token uuid NOT NULL DEFAULT gen_random_uuid();
