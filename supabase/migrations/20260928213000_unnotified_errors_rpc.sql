-- RPC for the inbox watcher: returns client errors not yet notified about.
-- The watcher alerts Max in chat, then marks them notified so each distinct
-- error (or re-firing error) alerts exactly once.
CREATE OR REPLACE FUNCTION public.get_unnotified_errors()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
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
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_unnotified_errors() TO anon, authenticated;
