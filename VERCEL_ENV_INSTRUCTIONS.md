# How to Configure Environment Variables in Vercel

To fix the database connection and ensure your app works in production, you must set the Supabase environment variables in Vercel.

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
    *   **Key**: `NEXT_PUBLIC_SUPABASE_URL`
    *   **Value**: *[Your unique Supabase Project URL]* (e.g., `https://xyzxyzxyz.supabase.co`)
    *   **Environments**: Check **Production**, **Preview**, and **Development**.
    *   Click **"Save"** or **"Add"**.

6.  **Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`**:
    *   **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   **Value**: *[Your Supabase Anon/Public Key]* (This is a long string starting with `ey...`)
    *   **Environments**: Check **Production**, **Preview**, and **Development**.
    *   Click **"Save"** or **"Add"**.

7.  **Redeploy**:
    *   Go to the **"Deployments"** tab.
    *   Click the **three dots (...)** next to the latest failed or active deployment.
    *   Select **"Redeploy"** to rebuild the app with the new variables.

## Where to find these keys?

1.  Log in to your **Supabase Dashboard**.
2.  Go to **Project Settings** (Cog icon at bottom left).
3.  Click on **API**.
4.  You will see the **Project URL** and **Project API keys** (anon public).
