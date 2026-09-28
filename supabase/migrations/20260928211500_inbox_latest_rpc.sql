-- Public, data-minimal RPC for the near-real-time inbox watcher.
-- Returns only the latest activity timestamps (no names, titles, or amounts),
-- so a lightweight poller can detect "something new came in" without secrets.
CREATE OR REPLACE FUNCTION public.get_inbox_latest()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'submissions',       (SELECT max(created_at) FROM public.submissions),
    'curator_apps',      (SELECT max(created_at) FROM public.curator_applications),
    'curator_pending',   (SELECT max(created_at) FROM public.profiles WHERE role = 'curator' AND verification_status = 'pending'),
    'mixing_orders',     (SELECT max(created_at) FROM public.mixing_orders),
    'withdrawals',       (SELECT max(created_at) FROM public.withdrawals),
    'support_tickets',   (SELECT max(created_at) FROM public.support_tickets)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_inbox_latest() TO anon, authenticated;
