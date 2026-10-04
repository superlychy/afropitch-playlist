-- Quiet the harmless "Error updating activity" network blips from error alerts.
-- These are transient client-side fetch failures (flaky mobile networks) on the
-- 2-minute activity heartbeat; the next poll always succeeds. They remain in
-- client_errors for diagnostics but no longer trigger watcher alerts.
CREATE OR REPLACE FUNCTION public.get_inbox_latest()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'submissions',       (SELECT max(created_at) FROM public.submissions),
    'curator_apps',      (SELECT max(created_at) FROM public.curator_applications),
    'curator_pending',   (SELECT max(created_at) FROM public.profiles WHERE role = 'curator' AND verification_status = 'pending'),
    'mixing_orders',     (SELECT max(created_at) FROM public.mixing_orders),
    'withdrawals',       (SELECT max(created_at) FROM public.withdrawals),
    'support_tickets',   (SELECT max(created_at) FROM public.support_tickets),
    'contact_messages',  (SELECT max(created_at) FROM public.system_logs WHERE event_type = 'contact_message'),
    'payment_failures',  (SELECT max(created_at) FROM public.system_logs WHERE event_type IN ('webhook_deposit_failed', 'webhook_missing_user_id', 'webhook_error')),
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
                          FROM public.client_errors
                          WHERE notified = false
                          AND NOT (message ILIKE '%updating activity%'
                                   AND (message ILIKE '%load failed%' OR message ILIKE '%failed to fetch%'))
                          LIMIT 10)
  );
$function$;
