# Resend to Discord Webhook Setup

Your Supabase Edge Function is deployed and ready to use!

## 1. The Webhook URL
Copy this URL:
```
https://gildytqinnntmtvbagxm.supabase.co/functions/v1/resend-webhook
```

## 2. Configure Resend
1. Go to your [Resend Dashboard](https://resend.com/webhooks).
2. Click **Add Webhook**.
3. Paste the URL above.
4. Select the events you want to be notified about:
   - `Email Sent`
   - `Email Delivered`
   - `Email Bounced`
   - `Email Complained`
   - `Email Opened` (Optional - can be noisy)
   - `Email Clicked` (Optional - can be noisy)
   - `Inbound Email` (if you receive emails)
5. Click **Add Webhook**.

## 3. Test It
Send an email through your app. You should see a notification in your Discord channel!

## Troubleshooting
If you don't see notifications:
- Check the Supabase Function logs in your Supabase Dashboard -> Edge Functions -> `resend-webhook` -> Logs.
- Ensure the Discord Webhook URL inside the function is correct (it is currently hardcoded in `supabase/functions/resend-webhook/index.ts`).
