# Setting up Notifications (Edge Functions)

To enable the email notifications for funding, approvals, and support tickets, follow these steps locally or in production.

## 1. Deploy the Function
Run the following command in your terminal (ensure Supabase CLI is installed):

```bash
supabase functions deploy notify-user
```
*Make sure you have added `RESEND_API_KEY` to your `.env` or Supabase secrets.*

## 2. Set up Database Webhooks (Triggers)
Go to your **Supabase Dashboard** > **Database** > **Webhooks** and create the following webhooks:

### Webhook 1: Transactions
*   **Name**: `notify-transactions`
*   **Table**: `transactions`
*   **Events**: `INSERT`
*   **Type**: HTTP Request
*   **URL**: `[YOUR_FUNCTION_URL]/notify-user` (e.g. `https://projectref.supabase.co/functions/v1/notify-user`)
*   **Method**: POST
*   **HTTP Headers**: `Authorization: Bearer [YOUR_ANON_KEY]` (or Service Role Key if needed)

### Webhook 2: Submissions
*   **Name**: `notify-submissions`
*   **Table**: `submissions`
*   **Events**: `UPDATE`
*   **Type**: HTTP Request
*   **URL**: `[YOUR_FUNCTION_URL]/notify-user`
*   **Method**: POST

### Webhook 3: Support Tickets
*   **Name**: `notify-support`
*   **Table**: `support_tickets`
*   **Events**: `UPDATE`
*   **Type**: HTTP Request
*   **URL**: `[YOUR_FUNCTION_URL]/notify-user`
*   **Method**: POST

### Webhook 4: Withdrawals
*   **Name**: `notify-withdrawals`
*   **Table**: `withdrawals`
*   **Events**: `UPDATE`
*   **Type**: HTTP Request
*   **URL**: `[YOUR_FUNCTION_URL]/notify-user`
*   **Method**: POST

## 3. Environment Variables
Ensure your Edge Function has access to:
*   `RESEND_API_KEY`: Your Resend API Key.
*   `SUPABASE_URL`: Your Project URL.
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Service Role Key.

Set them via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_123456...
```
