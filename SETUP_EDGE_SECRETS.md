# Quick Setup Guide - Edge Function Secrets

## ⚠️ CRITICAL: Complete this setup to enable notifications

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/gildytqinnntmtvbagxm
2. Navigate to **Edge Functions** in the left sidebar
3. Click on **Settings** or **Secrets**

### Step 2: Add the following secrets

Copy and paste each of these EXACTLY as shown:

```
Name: ADMIN_WEBHOOK_URL
Value: https://discord.com/api/webhooks/1459125838363754497/dXQejdouq2mKIzuFgC1V7UB8nxgbnacQiFijiN_A90hdUZ0MF_RaPeBFWJxY2zjsEhq5
```

```
Name: RESEND_API_KEY
Value: re_6vSRLRMH_GcESY6iM7u9UNk2WZ4Y6fW12
```

```
Name: SUPABASE_URL
Value: https://gildytqinnntmtvbagxm.supabase.co
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMjM5MSwiZXhwIjoyMDgyMjc4MzkxfQ.L37HsKmzmvxUh1r8r5dYrRuy8i50akMfd5hpWOcv5ms
```

```
Name: SITE_URL
Value: https://afropitchplay.best
```

### Step 3: Test the setup

1. Log out and log back into your application
2. Check your Discord channel - you should see a login notification
3. Try creating a test submission - you should see a submission notification

### What this fixes:
✅ Discord notifications for new users  
✅ Discord notifications for user logins  
✅ Discord notifications for playlist submissions  
✅ Discord notifications for withdrawal requests  
✅ Discord notifications for support tickets  
✅ Email notifications for users  

### If it doesn't work:
1. Double-check all secrets are entered correctly (no extra spaces)
2. Make sure you clicked "Save" after adding each secret
3. Check Edge Function logs in Supabase dashboard
4. Contact support with the SYSTEM_AUDIT_REPORT.md file

---

**Estimated time:** 5 minutes  
**Difficulty:** Easy (copy/paste)  
**Impact:** Critical - enables all business notifications
