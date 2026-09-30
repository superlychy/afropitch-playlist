-- Referral system: codes, balances, and reward ledger.
-- Reward: NGN 1,000 per referred artist, credited only when the referred
-- artist completes their first PAID playlist submission. Referral balance
-- can be spent on submissions but is never withdrawable as cash.

-- 1. Profile columns -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_balance numeric NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx
  ON public.profiles (referral_code);

-- 2. Code generator ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  code text;
BEGIN
  LOOP
    code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = code
    );
  END LOOP;
  RETURN code;
END;
$function$;

-- 3. Backfill codes for existing profiles -----------------------------------
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- 4. New users get a code from the signup trigger ---------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, balance, referral_code, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist'),
    0,
    public.generate_referral_code(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 5. Referral ledger ----------------------------------------------------------
-- One row per referred artist (unique referee_id): the reward can only ever
-- be granted once per referee, which also blocks duplicate/self rewards.
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  CONSTRAINT referrals_referee_once UNIQUE (referee_id),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_id);

-- 6. RLS: referrers can read their own referral rows --------------------------
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Writes go through the service-role API only (no insert/update/delete policy).
