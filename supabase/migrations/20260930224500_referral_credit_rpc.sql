-- Atomic referral-balance credit (avoids lost increments when two
-- referees of the same referrer qualify at the same time).
CREATE OR REPLACE FUNCTION public.credit_referral_balance(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $f$
BEGIN
  UPDATE public.profiles
  SET referral_balance = referral_balance + p_amount
  WHERE id = p_user_id;
END;
$f$;
