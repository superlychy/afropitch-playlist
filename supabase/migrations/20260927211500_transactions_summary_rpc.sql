-- Admin-only aggregate of ALL transactions by type. The admin TransactionsList
-- previously computed its summary-row totals from only the latest 200 rows
-- (.limit(200)), silently understating totals as volume grows.

CREATE OR REPLACE FUNCTION public.transactions_summary()
RETURNS TABLE(tx_type text, tx_count bigint, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public._is_admin_or_service() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    RETURN QUERY
    SELECT t.type::text, COUNT(*), COALESCE(SUM(t.amount), 0)
    FROM public.transactions t
    GROUP BY t.type;
END;
$function$;

REVOKE ALL ON FUNCTION public.transactions_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transactions_summary() TO authenticated;
