-- Admin transactions summary, currency-aware: rows are converted to NGN at
-- the fixed currency_prices rates before summing, so foreign-currency rows
-- no longer inflate the naira totals. Companion to the multi-currency
-- migration (20261026210000), which added transactions.currency.

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
    SELECT t.type::text, COUNT(*),
           COALESCE(SUM(t.amount * COALESCE(cp.price, 1)), 0)
    FROM public.transactions t
    LEFT JOIN public.currency_prices cp
      ON cp.currency = COALESCE(t.currency, 'NGN')
     AND cp.key = 'ngn_per_unit'
    GROUP BY t.type;
END;
$function$;

REVOKE ALL ON FUNCTION public.transactions_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transactions_summary() TO authenticated;
