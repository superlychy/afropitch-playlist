-- Fix Foreign Key Constraint on Support Messages
-- This allows deleting a user (profile) even if they have sent support messages.
-- The messages will be deleted along with the user.

ALTER TABLE public.support_messages
DROP CONSTRAINT IF EXISTS support_messages_sender_id_fkey;

ALTER TABLE public.support_messages
ADD CONSTRAINT support_messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
