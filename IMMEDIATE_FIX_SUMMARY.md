# IMMEDIATE FIX: admin@pressplaymusics.com ₦8,000 Payment

## ✅ Problem Identified
- **User:** admin@pressplaymusics.com (has "admin" in email but NOT an admin on the site)
- **Payment:** ₦8,000 via Paystack
- **Status:** Payment confirmed in Paystack dashboard, but NOT credited to AfroPitch account

## ✅ Solution Available

### Step 1: Run the SQL Fix (30 seconds)

1. Go to your Supabase Dashboard → SQL Editor
2. Run this query:

```sql
-- Find the user
SELECT id, email, full_name, balance
FROM public.profiles
WHERE email = 'admin@pressplaymusics.com';

-- Credit the user (replace USER_ID with the ID from above)
SELECT public.admin_top_up_user(
    p_user_id := 'USER_ID_HERE',
    p_amount := 8000,
    p_description := 'Manual fix: Paystack payment not credited - 2026-03-22'
);
```

Or run the full script I created: `/root/.openclaw/workspace/project/afropitch-app/credit-admin-payment.sql`

### Step 2: Verify the Fix

After running the SQL, verify the user got credited:

```sql
SELECT email, full_name, balance 
FROM public.profiles 
WHERE email = 'admin@pressplaymusics.com';
```

Expected: Balance should show ₦8,000 (or more if they had balance before)

---

## 🔧 Preventing This in the Future

I've created a comprehensive fix document at:
`/root/.openclaw/workspace/project/afropitch-app/PAYMENT_FIX_GUIDE.md`

**Key improvements to implement:**

1. **Better error logging** in the payment callback (artist/page.tsx)
2. **Paystack webhook handler** for server-side payment verification
3. **Payment status check endpoint** for users to verify deposits
4. **Admin dashboard payment issues tab** to track uncredited payments

---

## 📋 Files Created

| File | Purpose |
|------|---------|
| `credit-admin-payment.sql` | SQL script to run in Supabase |
| `PAYMENT_FIX_GUIDE.md` | Full technical documentation |
| `fix-payment.js` | Node.js script (needs env vars) |
| `IMMEDIATE_FIX_SUMMARY.md` | This summary |

---

## 🎯 Next Steps

1. **Immediate:** Run the SQL fix in Supabase (2 min)
2. **Short-term:** User can submit their playlist once credited
3. **Long-term:** Implement webhook handler for automatic payment processing

The user should be able to submit their playlist once the ₦8,000 is credited to their account.
