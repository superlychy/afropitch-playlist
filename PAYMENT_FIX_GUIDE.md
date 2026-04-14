# Payment Fix Guide: admin@pressplaymusics.com

## Issue Summary
- **User:** admin@pressplaymusics.com (not an admin, just has "admin" in email)
- **Payment:** ₦8,000 via Paystack
- **Problem:** Payment went through (confirmed in Paystack dashboard) but not credited to AfroPitch account
- **Status:** Need to manually credit + fix the flow

## Immediate Fix (Run in Supabase SQL Editor)

### Option 1: Use the admin_top_up_user function

```sql
-- Find the user
SELECT id, email, full_name, balance
FROM public.profiles
WHERE email = 'admin@pressplaymusics.com';

-- Credit the user (replace USER_ID with actual ID from above)
SELECT public.admin_top_up_user(
    p_user_id := 'USER_ID_HERE',
    p_amount := 8000,
    p_description := 'Manual fix: Paystack payment not credited - 2026-03-22'
);

-- Verify
SELECT email, full_name, balance
FROM public.profiles
WHERE email = 'admin@pressplaymusics.com';
```

### Option 2: Use the SQL script I created
Run the `credit-admin-payment.sql` file in Supabase SQL Editor.

---

## Root Cause Analysis

### Why did the payment fail to credit?

Looking at the payment flow in `src/app/dashboard/artist/page.tsx`:

```typescript
const handlePaymentSuccess = useCallback(async (reference: any) => {
  // ... validation code ...
  const { data: result, error } = await supabase.rpc("process_deposit", {
    p_user_id: currentUser.id,
    p_amount: val,
    p_reference: paystackRef,
    p_description: `Wallet Deposit: ${paystackRef}`,
  });

  if (error) {
    console.error("process_deposit RPC error:", error);
    toast(`Payment received but failed to credit. Ref: ${paystackRef}. Contact support.`, "error");
    paystackLockRef.current = false;
    return;
  }
  // ... success handling ...
}, [refreshUser, toast]);
```

**Possible failure points:**
1. **Session expired** during payment → `currentUser.id` might be null/invalid
2. **RPC function failed** silently or with error not properly handled
3. **Paystack callback** not firing or firing with incomplete data
4. **Network issue** during the RPC call
5. **User profile not found** or `process_deposit` failed

### The `process_deposit` function (from migration):
```sql
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_ref text;
BEGIN
  -- Idempotency check
  SELECT reference INTO v_existing_ref
  FROM public.transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_ref IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Payment already processed');
  END IF;

  -- Credit wallet
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, type, description, reference)
  VALUES (p_user_id, p_amount, 'deposit', COALESCE(p_description, 'Wallet Deposit'), p_reference);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
```

---

## Preventive Fixes for Next Time

### 1. Add Better Error Logging in Payment Callback

Update `src/app/dashboard/artist/page.tsx` - `handlePaymentSuccess` function:

```typescript
const handlePaymentSuccess = useCallback(async (reference: any) => {
  if (paystackLockRef.current) return;
  paystackLockRef.current = true;

  const currentUser = userRef.current;
  const rawAmount = amountRef.current;
  const val = parseInt(rawAmount);

  // ADD: Enhanced validation
  if (!currentUser?.id) {
    console.error("Payment callback: user session lost", { reference, timestamp: new Date().toISOString() });
    toast("Session expired. Please top up again.", "error");
    paystackLockRef.current = false;
    return;
  }

  if (val <= 0) {
    console.error("Payment callback: invalid amount", { amount: rawAmount, reference });
    toast("Invalid amount. Please try again.", "error");
    paystackLockRef.current = false;
    return;
  }

  let paystackRef = "";
  if (typeof reference === "string") paystackRef = reference;
  else if (reference && typeof reference === "object")
    paystackRef = reference.reference || reference.trxref || `manual_ref_${Date.now()}`;
  else paystackRef = `manual_ref_${Date.now()}`;

  console.log("Processing payment:", { userId: currentUser.id, amount: val, ref: paystackRef });

  const { data: result, error } = await supabase.rpc("process_deposit", {
    p_user_id: currentUser.id,
    p_amount: val,
    p_reference: paystackRef,
    p_description: `Wallet Deposit: ${paystackRef}`,
  });

  // ADD: Better error handling
  if (error) {
    console.error("process_deposit RPC error:", {
      error,
      userId: currentUser.id,
      amount: val,
      reference: paystackRef,
      timestamp: new Date().toISOString()
    });
    
    // Log to system logs for admin review
    await supabase.from("system_logs").insert({
      event_type: "payment_failed",
      event_data: {
        user_id: currentUser.id,
        amount: val,
        reference: paystackRef,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
    
    toast(`Payment received but failed to credit. Ref: ${paystackRef}. Contact support.`, "error");
    paystackLockRef.current = false;
    return;
  }

  if (result?.success === false) {
    console.warn("Payment already processed:", result);
    toast("This payment was already processed. Refreshing balance...", "warning");
  } else {
    console.log("Payment credited successfully:", { userId: currentUser.id, amount: val, ref: paystackRef });
    toast(`₦${val.toLocaleString()} loaded to your wallet! ✅`, "success");
  }

  await refreshUser();
  setAmount("");
  setLockedAmount(0);
  paystackLockRef.current = false;
}, [refreshUser, toast]);
```

### 2. Add Paystack Webhook Handler (Recommended)

Create `src/app/api/paystack/webhook/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Verify Paystack signature (add your secret key)
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers.get('x-paystack-signature');
    
    // TODO: Implement signature verification
    
    if (body.event === 'charge.success') {
      const { reference, amount, customer } = body.data;
      const userId = body.data.metadata?.user_id;
      
      if (!userId) {
        console.error("Paystack webhook: missing user_id", { reference });
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }
      
      // Process deposit
      const { data: result, error } = await supabase.rpc("process_deposit", {
        p_user_id: userId,
        p_amount: amount / 100, // Convert from kobo
        p_reference: reference,
        p_description: `Paystack Deposit: ${reference}`
      });
      
      if (error) {
        console.error("Webhook deposit error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: true, message: "Event not processed" });
  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### 3. Add Payment Status Check Endpoint

Create `src/app/api/payment/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  const userId = searchParams.get("userId");
  
  if (!reference || !userId) {
    return NextResponse.json({ error: "Missing reference or userId" }, { status: 400 });
  }
  
  // Check if transaction exists
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("reference", reference)
    .eq("user_id", userId)
    .single();
  
  // Check user balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();
  
  return NextResponse.json({
    credited: !!transaction,
    transaction,
    currentBalance: profile?.balance || 0
  });
}
```

### 4. Update Admin Dashboard to Show Payment Issues

Add a payment issues tab to the admin dashboard to track uncredited payments.

---

## Testing the Fix

1. **Run the SQL script** in Supabase SQL Editor
2. **Verify user balance** increased by ₦8,000
3. **Check transactions table** for the new deposit record
4. **Test the payment flow** with a small amount (₦100)
5. **Monitor error logs** in Supabase for any payment issues

---

## Notes

- User `admin@pressplaymusics.com` is NOT an admin - just has "admin" in email
- Ensure Paystack webhook is configured in Paystack dashboard
- Consider adding email confirmation for deposits > ₦10,000
- Add rate limiting to prevent payment spam
