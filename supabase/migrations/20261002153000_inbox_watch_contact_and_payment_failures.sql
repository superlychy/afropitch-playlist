-- Extend the inbox watcher RPC with contact form messages and payment failures.
-- contact_messages: site contact form submissions (system_logs event_type='contact_message')
-- payment_failures: Paystack webhook deposit failures (webhook_deposit_failed,
--   webhook_missing_user_id, webhook_error) so failed wallet top-ups alert fast.
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
                          FROM public.client_errors WHERE notified = false LIMIT 10)
  );
$function$;
