-- Deleting a user was blocked when they had notifications:
-- public.notifications.user_id -> auth.users(id) had no ON DELETE action.
-- Cascade it like every other user-owned row.
ALTER TABLE public.notifications
    DROP CONSTRAINT notifications_user_id_fkey,
    ADD CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
