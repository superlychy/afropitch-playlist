-- Fix analytics heartbeat tracking (broken since 2026-03-20).
--
-- The 20260318000001_complete_setup migration added duplicate TEXT overloads of
-- increment_analytics_duration / increment_analytics_clicks_count alongside the
-- original UUID overloads. PostgREST then resolved the app's RPC calls to the text
-- overload, whose "WHERE session_id(uuid) = p_session_id(text)" matched zero rows
-- (supabase-js does not throw on the failed call, and /api/analytics swallows it),
-- so every heartbeat since March silently did nothing: duration_seconds and clicks
-- stayed 0 for all new sessions. The session_id column is uuid, so keep only the
-- uuid overloads.
DROP FUNCTION IF EXISTS public.increment_analytics_duration(text, int);
DROP FUNCTION IF EXISTS public.increment_analytics_clicks_count(text, int);

-- Summary aggregates for the admin analytics dashboard. The dashboard page used to
-- compute KPIs over only the latest 300 session rows, massively undercounting
-- unique visitors, clicks, and longest session. This returns true totals.
CREATE OR REPLACE FUNCTION public.analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        'total_clicks', COALESCE(SUM(clicks), 0),
        'total_page_views', COALESCE(SUM(page_views), 0),
        'longest_session_seconds', COALESCE(MAX(duration_seconds), 0),
        'active_now', COUNT(DISTINCT ip_address) FILTER (WHERE last_seen_at > now() - interval '5 minutes')
    )
    INTO result
    FROM public.analytics_visits;
    RETURN result;
END;
$$;
