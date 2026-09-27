-- Allow anonymous (visitor) support tickets to have message rows.
-- sender_id stays a foreign key to profiles(id) for logged-in users,
-- but anonymous tickets created from the help-chat widget have no user,
-- so the initial message row is stored with sender_id = NULL.

ALTER TABLE public.support_messages
  ALTER COLUMN sender_id DROP NOT NULL;
