# specific instructions to Fix "Spam" Password Reset Emails

The issue is that your Password Reset emails are likely using a default or plain text template that looks like spam, OR the sender email in Supabase doesn't perfectly match your verified Resend domain.

## Step 1: Update the Email Template (Crucial)

I have created a professional, spam-proof HTML template for you.

1.  Open the file `supabase/email_reset_password.html` in your project (or copy the code below).
2.  Go to **Supabase Dashboard** -> **Authentication** -> **Email Templates**.
3.  Click on **Reset Password**.
4.  **Subject:** `Reset your AfroPitch password`
5.  **Message Body:** Paste the following HTML code:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; margin: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #0d0d0d; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 30px 20px; text-align: center; border-bottom: 3px solid #16a34a; }
        .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 800; text-transform: uppercase; }
        .content { padding: 40px 30px; line-height: 1.6; color: #e5e7eb; }
        .button { display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #111; border-top: 1px solid #333; }
        .link-text { color: #16a34a; word-break: break-all; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>AfroPitch</h1>
            </div>
            <div class="content">
                <h2 style="margin-top: 0; color: #fff;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset the password for your AfroPitch account. No changes have been made to your account yet.</p>
                <p>You can reset your password by clicking the link below:</p>
                
                <div style="text-align: center;">
                    <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
                </div>

                <p style="font-size: 13px; color: #888;">This link will expire in 1 hour.</p>
                
                <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #888;">
                    If you did not request a password reset, please ignore this email.<br>
                    <strong>Can't click the button?</strong> Copy and paste this link:<br>
                    <a href="{{ .ConfirmationURL }}" class="link-text">{{ .ConfirmationURL }}</a>
                </p>
            </div>
            <div class="footer">
                &copy; {{ .Year }} AfroPitch. All rights reserved.<br>
                Lagos • Accra • Johannesburg • Global
            </div>
        </div>
    </div>
</body>
</html>
```

## Step 2: Verify Sender Email

Your application code uses `notifications@afropitchplay.best`. Your Supabase Auth **MUST** use the exact same domain.

1.  Go to **Supabase Dashboard** -> **Project Settings** -> **Auth** -> **SMTP Settings**.
2.  Check **Sender Email**.
    *   **Correct:** `support@afropitchplay.best` or `notifications@afropitchplay.best`
    *   **Incorrect:** `afropitch@gmail.com` or `admin@afropitch.com` (if `.com` isn't verified in Resend)
3.  Ensure **Sender Name** is set to `AfroPitch Support`.

## Step 3: Warm Up

Since you just marked the previous emails as "Not Spam", your personal Gmail has learned. But for others, the new HTML template + correct Sender Domain will fix it.
