# Environment Setup

To make the app fully functional with a Database and Payments, you need to set up two services:

## 1. Supabase (Database & Auth)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Go to Project Settings -> API.
3. Copy the `Project URL` and `anon public key`.
4. Create a file named `.env.local` in this folder and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=paste_your_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_key_here
   ```

## 2. Paystack (Payments)
1. Go to [paystack.com](https://paystack.com) and create an account.
2. Go to Settings -> API Keys & Webhooks.
3. Copy your `Test Public Key`.
4. Add it to your `.env.local` file:
   ```
   NEXT_PUBLIC_PAYSTACK_KEY=pk_test_xxxxxxxx
   ```

## 3. Mobile App (Capacitor)
This project is already configured for mobile.
To build the Android app:
1. Run `npm run build`
2. Run `npx cap add android`
3. Run `npx cap open android` (This opens Android Studio)
