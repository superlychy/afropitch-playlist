# Quick Setup Guide - Edge Function Secrets

## ⚠️ CRITICAL: Complete this setup to enable notifications

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/gildytqinnntmtvbagxm
2. Navigate to **Edge Functions** in the left sidebar
3. Click on **Settings** or **Secrets**

### Step 2: Add the following secrets

You need to configure these 5 environment variables. Get the values from your `.env.local` file:

```
Name: ADMIN_WEBHOOK_URL
Value: [Get from .env.local - ADMIN_WEBHOOK_URL]
```

```
Name: RESEND_API_KEY
Value: [Get from .env.local - RESEND_API_KEY]
```

```
Name: SUPABASE_URL
Value: [Get from .env.local - NEXT_PUBLIC_SUPABASE_URL]
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: [Get from .env.local - SUPABASE_SERVICE_ROLE_KEY]
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
4. Verify the values match exactly what's in your .env.local file

---

**Estimated time:** 5 minutes  
**Difficulty:** Easy (copy/paste from .env.local)  
**Impact:** Critical - enables all business notifications
