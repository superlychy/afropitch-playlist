-- RPC function to atomically increment clicks
CREATE OR REPLACE FUNCTION increment_analytics_clicks(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visits
  SET clicks = COALESCE(clicks, 0) + 1,
      last_seen_at = now()
  WHERE session_id = p_session_id;
END;
$$;

-- RPC function to atomically increment duration
CREATE OR REPLACE FUNCTION increment_analytics_duration(p_session_id uuid, p_seconds int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visits
  SET duration_seconds = COALESCE(duration_seconds, 0) + p_seconds,
      last_seen_at = now()
  WHERE session_id = p_session_id;
END;
$$;
