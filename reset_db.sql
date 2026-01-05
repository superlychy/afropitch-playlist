-- DANGEROUS: Wipes all data to start fresh.
TRUNCATE TABLE public.transactions,
               public.submissions,
               public.playlists,
               public.withdrawals,
               public.support_tickets,
               public.support_messages,
               public.broadcasts
               RESTART IDENTITY CASCADE;

-- Clear profiles (optional: if you want to wipe users too, but auth.users persists unless deleted via dashboard)
-- TRUNCATE TABLE public.profiles RESTART IDENTITY CASCADE;
