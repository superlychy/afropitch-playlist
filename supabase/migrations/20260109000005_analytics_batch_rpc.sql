-- RPC function to atomically increment clicks by a specific count (for batching)
CREATE OR REPLACE FUNCTION increment_analytics_clicks_count(p_session_id uuid, p_count int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_visits
  SET clicks = COALESCE(clicks, 0) + p_count,
      last_seen_at = now()
  WHERE session_id = p_session_id;
END;
$$;
