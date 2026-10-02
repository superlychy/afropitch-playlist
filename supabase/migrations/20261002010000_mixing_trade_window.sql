-- Mixing trade window (2026-10-02)
--
-- Policy (Max, 2026-10-02):
--   * Each mix order is a temporary trade window (like a Binance position).
--     It opens at payment and closes at completion or refund.
--   * No mixing balance, no second wallet. No withdraw UI for artists at all.
--     Only curators withdraw (review earnings) — unchanged.
--   * Preview stage: engineer uploads preview; artist gets 30s tagged playback.
--     72h countdown restarts after EVERY preview. Buttons (Accept / Adjust /
--     Decline) appear only when a preview is delivered.
--   * Accept (preview) -> engineer PAID immediately -> engineer uploads final.
--   * Adjust -> back to in_progress for corrections (chat + voice notes).
--   * Decline -> ends the mix. Artist enters bank details IN THE WINDOW.
--     75% refunded by manual bank transfer (Max). 25% kept by platform.
--   * Cancel before engineer starts (in_escrow): 95% refunded, 5% kept.
--   * Refunds NEVER go to the wallet. Terms shown only at decline/cancel.
--   * Final stage: 3-day SINGLE revision window from first final delivery
--     (never restarts). Then window closes: download unlocked on artist page,
--     chat read-only marked closed.
--
-- New statuses: final_pending, final_delivered, refund_pending.
-- (The pre-existing status CHECK is extended to allow them.)

ALTER TABLE public.mixing_orders DROP CONSTRAINT IF EXISTS mixing_orders_status_check;
ALTER TABLE public.mixing_orders ADD CONSTRAINT mixing_orders_status_check
CHECK (status = ANY (ARRAY['awaiting_payment','in_escrow','in_progress','delivered','final_pending','final_delivered','refund_pending','completed','refunded','cancelled']));

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.mixing_orders
ADD COLUMN IF NOT EXISTS refund_bank_name text,
ADD COLUMN IF NOT EXISTS refund_account_number text,
ADD COLUMN IF NOT EXISTS refund_account_name text,
ADD COLUMN IF NOT EXISTS refund_percent numeric,
ADD COLUMN IF NOT EXISTS refund_amount numeric,
ADD COLUMN IF NOT EXISTS refund_fee_amount numeric,
ADD COLUMN IF NOT EXISTS refund_paid_at timestamptz,
ADD COLUMN IF NOT EXISTS refund_paid_reference text,
ADD COLUMN IF NOT EXISTS refund_processed_by uuid,
ADD COLUMN IF NOT EXISTS preview_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS first_final_delivered_at timestamptz;

-- Voice-note attachments for the mixing chat.
ALTER TABLE public.mixing_messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text;

-- ---------------------------------------------------------------------------
-- accept_mix_preview: artist accepts the preview -> engineer PAID now ->
-- order waits for the final mix upload.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_mix_preview(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_admin_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'delivered' THEN
        RETURN json_build_object('success', false, 'message', 'Preview is not awaiting your decision');
    END IF;

    -- Engineer gets paid on preview acceptance.
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;

    UPDATE public.mixing_orders
       SET status = 'final_pending',
           preview_accepted_at = now(),
           updated_at = now()
     WHERE id = p_order_id;

    INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
    VALUES (v_admin_id, v_order.amount, 'earning',
            'Mixing completed (preview accepted): ' || v_order.package_name || ' — ' || v_order.song_title,
            v_order.submission_id);

    -- Preview has served its purpose; remove it from Cloudinary.
    -- (Handled client-side via deleteMixPreview; kept out of the RPC.)

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- adjust_mix: artist asks for corrections -> back to in_progress.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_mix(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'delivered' THEN
        RETURN json_build_object('success', false, 'message', 'Nothing to adjust right now');
    END IF;

    UPDATE public.mixing_orders
       SET status = 'in_progress', updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- decline_mix: artist declines the delivered preview -> refund flow (75%).
-- Bank details are collected up front, in the window.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_mix(
    p_order_id uuid,
    p_bank_name text,
    p_account_number text,
    p_account_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_refund numeric;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'delivered' THEN
        RETURN json_build_object('success', false, 'message', 'This order cannot be declined right now');
    END IF;
    IF p_bank_name IS NULL OR btrim(p_bank_name) = ''
       OR p_account_number IS NULL OR btrim(p_account_number) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Bank details are required for the refund');
    END IF;

    -- 75% back to the artist, 25% kept by the platform.
    v_refund := floor(v_order.amount * 0.75);

    UPDATE public.mixing_orders
       SET status = 'refund_pending',
           refund_bank_name = btrim(p_bank_name),
           refund_account_number = btrim(p_account_number),
           refund_account_name = nullif(btrim(p_account_name), ''),
           refund_percent = 75,
           refund_amount = v_refund,
           refund_fee_amount = v_order.amount - v_refund,
           refund_requested_at = now(),
           updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'refund_amount', v_refund);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- cancel_mix_order: artist cancels before the engineer starts -> 95%.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_mix_order(
    p_order_id uuid,
    p_bank_name text,
    p_account_number text,
    p_account_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_refund numeric;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'in_escrow' THEN
        RETURN json_build_object('success', false, 'message', 'This order can no longer be cancelled');
    END IF;
    IF p_bank_name IS NULL OR btrim(p_bank_name) = ''
       OR p_account_number IS NULL OR btrim(p_account_number) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Bank details are required for the refund');
    END IF;

    -- 95% back to the artist, 5% kept for transaction charges.
    v_refund := floor(v_order.amount * 0.95);

    UPDATE public.mixing_orders
       SET status = 'refund_pending',
           refund_bank_name = btrim(p_bank_name),
           refund_account_number = btrim(p_account_number),
           refund_account_name = nullif(btrim(p_account_name), ''),
           refund_percent = 95,
           refund_amount = v_refund,
           refund_fee_amount = v_order.amount - v_refund,
           refund_requested_at = now(),
           updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'refund_amount', v_refund);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- deliver_final_mix: engineer uploads the final mix.
-- From final_pending (first final) or in_progress (a revision re-delivery).
-- The 3-day revision window is anchored at the FIRST final delivery and
-- never restarts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deliver_final_mix(p_order_id uuid, p_final_link text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_order record;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF p_final_link IS NULL OR btrim(p_final_link) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Final mix link required');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF NOT (
        v_order.status = 'final_pending'
        OR (v_order.status = 'in_progress' AND v_order.first_final_delivered_at IS NOT NULL)
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Order cannot receive the final mix right now');
    END IF;

    UPDATE public.mixing_orders
       SET full_link = btrim(p_final_link),
           status = 'final_delivered',
           first_final_delivered_at = COALESCE(first_final_delivered_at, now()),
           delivered_at = now(),
           updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- request_final_revision: artist asks for a last correction on the final.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_final_revision(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'final_delivered' THEN
        RETURN json_build_object('success', false, 'message', 'Nothing to revise right now');
    END IF;
    IF v_order.first_final_delivered_at < now() - interval '3 days' THEN
        RETURN json_build_object('success', false, 'message', 'The revision window has closed');
    END IF;

    UPDATE public.mixing_orders
       SET status = 'in_progress', updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- satisfy_mix: artist confirms the final -> window closes (completed).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.satisfy_mix(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.artist_id IS DISTINCT FROM auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF v_order.status != 'final_delivered' THEN
        RETURN json_build_object('success', false, 'message', 'Nothing to confirm right now');
    END IF;

    UPDATE public.mixing_orders
       SET status = 'completed', updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- complete_mix_refund: admin records the manual bank transfer -> refunded.
-- The money never touches the wallet; transactions are record-only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_mix_refund(p_order_id uuid, p_reference text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_order record;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.status != 'refund_pending' THEN
        RETURN json_build_object('success', false, 'message', 'Order is not awaiting a refund');
    END IF;
    IF p_reference IS NULL OR btrim(p_reference) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Transfer reference required');
    END IF;

    UPDATE public.mixing_orders
       SET status = 'refunded',
           refund_paid_at = now(),
           refund_paid_reference = btrim(p_reference),
           refund_processed_by = auth.uid(),
           updated_at = now()
     WHERE id = p_order_id;

    -- Record-only: the refund went by bank transfer, not through the wallet.
    INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
    VALUES (v_order.artist_id, v_order.refund_amount, 'refund',
            'Mixing refund via bank transfer (' || v_order.refund_percent::text || '% of ' ||
            v_order.package_name || ' — ' || v_order.song_title || '). Ref: ' || btrim(p_reference),
            v_order.submission_id);

    RETURN json_build_object('success', true, 'refund_amount', v_order.refund_amount);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- reject_mix_refund: admin sends the order back (to delivered or in_escrow).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_mix_refund(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_order record;
    v_back_to text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    SELECT * INTO v_order FROM public.mixing_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;
    IF v_order.status != 'refund_pending' THEN
        RETURN json_build_object('success', false, 'message', 'Order is not awaiting a refund');
    END IF;

    -- 75% refunds came from a declined preview -> back to delivered.
    -- 95% refunds came from a pre-start cancel -> back to in_escrow.
    v_back_to := CASE WHEN COALESCE(v_order.refund_percent, 75) = 95 THEN 'in_escrow' ELSE 'delivered' END;

    UPDATE public.mixing_orders
       SET status = v_back_to,
           refund_bank_name = NULL,
           refund_account_number = NULL,
           refund_account_name = NULL,
           refund_percent = NULL,
           refund_amount = NULL,
           refund_fee_amount = NULL,
           refund_requested_at = NULL,
           updated_at = now()
     WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'status', v_back_to);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- deliver_mix: engineer delivers the PREVIEW (reworked: preview only).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.deliver_mix(uuid, text, text);

CREATE OR REPLACE FUNCTION public.deliver_mix(p_order_id uuid, p_preview_link text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_updated int;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_role, '') != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Not authorized');
    END IF;
    IF p_preview_link IS NULL OR btrim(p_preview_link) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Preview link required');
    END IF;

    UPDATE public.mixing_orders
       SET preview_link = btrim(p_preview_link),
           status = 'delivered',
           delivered_at = now(),
           updated_at = now()
     WHERE id = p_order_id
       AND status IN ('in_escrow', 'in_progress')
       AND first_final_delivered_at IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
        RETURN json_build_object('success', false, 'message', 'Order cannot receive a preview right now');
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- Retire the old wallet-credit refund flow (replaced by bank refunds).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.refund_mix(uuid, text);
DROP FUNCTION IF EXISTS public.request_mix_refund(uuid, text);
DROP FUNCTION IF EXISTS public.resolve_mix_refund(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.accept_mix(uuid);

-- ---------------------------------------------------------------------------
-- request_payout: artists have no withdrawal at all. Curators unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_payout(
    p_user_id uuid,
    p_amount numeric,
    p_bank_name text,
    p_account_number text,
    p_account_name text,
    p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance numeric;
    v_withdrawable numeric;
    v_role text;
    v_withdrawal_id uuid;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT balance, withdrawable_balance, role
    INTO v_balance, v_withdrawable, v_role
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    -- Artists do not withdraw. Mixing refunds go by bank transfer instead.
    IF v_role = 'artist' THEN
        RETURN json_build_object('success', false, 'message', 'Withdrawals are not available for artists');
    END IF;

    IF COALESCE(v_withdrawable, 0) < p_amount THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    IF p_amount < 5000 THEN
        RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is ₦5,000');
    END IF;

    UPDATE public.profiles
    SET balance = balance - p_amount,
        withdrawable_balance = withdrawable_balance - p_amount
    WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -p_amount,
        'withdrawal',
        'Payout Request to ' || p_bank_name || ' (' || RIGHT(p_account_number, 4) || ')'
    );

    INSERT INTO public.withdrawals (
        user_id, amount, bank_name, account_number, account_name, reason, status, from_withdrawable
    ) VALUES (
        p_user_id, p_amount, p_bank_name, p_account_number, p_account_name,
        NULLIF(btrim(p_reason), ''), 'pending', p_amount
    ) RETURNING id INTO v_withdrawal_id;

    RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- auto_complete_expired_mixes: two timers now.
--   1. Preview delivered 72h with no artist response -> preview auto-accepted
--      (engineer paid), order waits for the final mix.
--   2. Final delivered 3 days (single window from FIRST final) -> completed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_complete_expired_mixes()
RETURNS TABLE(order_id uuid, song_title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;

  -- 1. Preview auto-accept after 72h of silence.
  FOR v_order IN
    SELECT * FROM public.mixing_orders
     WHERE status = 'delivered'
       AND delivered_at IS NOT NULL
       AND delivered_at < now() - interval '72 hours'
     ORDER BY delivered_at
  LOOP
    UPDATE public.mixing_orders
       SET status = 'final_pending',
           preview_accepted_at = now(),
           updated_at = now()
     WHERE id = v_order.id AND status = 'delivered';
    IF FOUND THEN
      INSERT INTO public.transactions (user_id, amount, type, description, related_submission_id)
      VALUES (v_admin_id, v_order.amount, 'earning',
              'Mixing preview auto-accepted after 72h: ' || v_order.package_name || ' — ' || v_order.song_title,
              v_order.submission_id);
      order_id := v_order.id;
      song_title := v_order.song_title;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- 2. Revision window closes 3 days after the FIRST final delivery.
  FOR v_order IN
    SELECT * FROM public.mixing_orders
     WHERE status = 'final_delivered'
       AND first_final_delivered_at IS NOT NULL
       AND first_final_delivered_at < now() - interval '3 days'
     ORDER BY first_final_delivered_at
  LOOP
    UPDATE public.mixing_orders
       SET status = 'completed', updated_at = now()
     WHERE id = v_order.id AND status = 'final_delivered';
    IF FOUND THEN
      order_id := v_order.id;
      song_title := v_order.song_title;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- Grants for the new RPCs.
GRANT EXECUTE ON FUNCTION public.accept_mix_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_mix(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_mix(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_mix_order(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_final_revision(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.satisfy_mix(uuid) TO authenticated;
