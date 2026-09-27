-- Migration: route new support tickets through notify-user (email) instead of the
-- broken legacy admin webhook trigger.
--
-- The old "notify-tickets" trigger POSTed an empty '{}' body to the notify-admin
-- edge function, so no acknowledgement or admin-notification emails were ever sent
-- for new support tickets (and notify-admin was ~7 months stale anyway).
-- This mirrors the established pattern used by on_ticket_update / on_broadcast_insert /
-- notify_mixing_messages_insert, which all call public.notify_user_webhook().
-- Applied directly to live DB 2026-09-27 during the support-chat end-to-end test.

DROP TRIGGER IF EXISTS "notify-tickets" ON public.support_tickets;
DROP TRIGGER IF EXISTS "notify-messages" ON public.support_messages;

DROP TRIGGER IF EXISTS on_ticket_insert ON public.support_tickets;
CREATE TRIGGER on_ticket_insert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_webhook();
