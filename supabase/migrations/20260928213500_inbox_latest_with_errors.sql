-- Merge the error check into get_inbox_latest so the watcher makes ONE
-- tiny RPC call per poll instead of two.
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
    'support_tickets',   (SELECT max(created_at) FROM public.support_tickets),
    'errors',            (SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                              'id', id,
                              'kind', kind,
                              'message', left(message, 200),
                              'url', left(url, 200),
                              'error_count', error_count,
                              'last_seen', last_seen
                            ) ORDER BY last_seen DESC
                          ), '[]'::jsonb)
                          FROM public.client_errors WHERE notified = false LIMIT 10)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_inbox_latest() TO anon, authenticated;
