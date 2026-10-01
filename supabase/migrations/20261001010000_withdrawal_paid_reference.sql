-- Payout loop: record the actual transfer reference when the money is sent.
-- The withdrawals table already had processed_at/processed_by; this adds the
-- transfer reference so an approved payout can be told apart from a paid one.
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS paid_reference text;
COMMENT ON COLUMN public.withdrawals.paid_reference IS 'Bank/Opay transfer reference recorded by the admin when the payout money was actually sent.';
