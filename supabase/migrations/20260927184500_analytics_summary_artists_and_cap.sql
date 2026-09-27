-- Extend analytics_summary: add total_artists count and cap longest session.
--
-- total_artists: true count of artist profiles (the "Registered Users" figure only
-- counts distinct logged-in users the tracker has seen, which undercounts).
-- longest_session_seconds: capped at 12h (43200s) so abandoned tabs don't skew it.
CREATE OR REPLACE FUNCTION public.analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    SELECT jsonb_build_object(
        'total_sessions', COUNT(*),
        'unique_visitors', COUNT(DISTINCT ip_address),
        'registered_users', COUNT(DISTINCT user_id),
        'total_artists', (SELECT COUNT(*) FROM public.profiles WHERE role = 'artist'),
        'total_clicks', COALESCE(SUM(clicks), 0),
        'total_page_views', COALESCE(SUM(page_views), 0),
        'longest_session_seconds', LEAST(COALESCE(MAX(duration_seconds), 0), 43200),
        'active_now', COUNT(DISTINCT ip_address) FILTER (WHERE last_seen_at > now() - interval '5 minutes')
    )
    INTO result
    FROM public.analytics_visits;
    RETURN result;
END;
$function$;
