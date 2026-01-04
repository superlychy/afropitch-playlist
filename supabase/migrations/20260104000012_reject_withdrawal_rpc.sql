-- Function to safely reject a withdrawal and refund the artist
CREATE OR REPLACE FUNCTION reject_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT 'Withdrawal Rejected'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL;
  v_status TEXT;
BEGIN
  -- 1. Get withdrawal details and lock the row
  SELECT user_id, amount, status
  INTO v_user_id, v_amount, v_status
  FROM withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  -- 2. Validate
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is is not pending (current status: %)', v_status;
  END IF;

  -- 3. Update withdrawal status
  UPDATE withdrawals
  SET status = 'rejected'
  WHERE id = p_withdrawal_id;

  -- 4. Refund user balance
  UPDATE profiles
  SET balance = balance + v_amount
  WHERE id = v_user_id;

  -- 5. Create refund transaction record
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_amount, 'refund', p_reason);

  RETURN TRUE;
END;
$$;
