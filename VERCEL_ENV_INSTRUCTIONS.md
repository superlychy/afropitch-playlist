# How to Configure Environment Variables in Vercel

To fix the database connection AND payment processing in production, you must set these variables in Vercel.

## Steps

1.  **Log in to Vercel**: 
    Go to [vercel.com](https://vercel.com) and log in.

2.  **Select Your Project**: 
    Click on the **"afropitch-playlist"** project from your dashboard.

3.  **Go to Settings**: 
    Click on the **"Settings"** tab in the top navigation bar.

4.  **Open Environment Variables**: 
    Click on **"Environment Variables"** in the left sidebar.

5.  **Add `NEXT_PUBLIC_SUPABASE_URL`**:
    *   **Value**: `https://gildytqinnntmtvbagxm.supabase.co`

6.  **Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
    *   **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbGR5dHFpbm5udG10dmJhZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDIzOTEsImV4cCI6MjA4MjI3ODM5MX0.9x7utKiltdD8zzwWWi_8D2PTW0Y17Pi9dHQ5eTnX7fg`

7.  **Add `NEXT_PUBLIC_PAYSTACK_KEY`**: (LIVE KEY)
    *   **Key**: `NEXT_PUBLIC_PAYSTACK_KEY`
    *   **Value**: `pk_live_c6da51f7f1185e311f7356f586f5817ed6c69591`

8.  **Redeploy**:
    *   Go to the **"Deployments"** tab.
    *   Click the **three dots (...)** next to the latest deployment.
    *   Select **"Redeploy"** to apply these live keys.

## Notes
*   We have updated the Paystack keys to **LIVE** mode. Real money will be charged.
*   Ensure your Paystack Dashboard is also toggled to "Live Mode".
