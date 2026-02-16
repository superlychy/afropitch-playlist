# Production Environment Setup

## Issue
The production deployment is showing "API Invalid" errors because environment variables from `.env.local` are not automatically deployed (this file is gitignored for security).

## Solution
You need to set environment variables in your hosting platform using the SAME values from your local `.env.local` file.

### Required Environment Variables

Copy these variable NAMES and set them in your hosting platform with the values from your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PAYSTACK_KEY
RESEND_API_KEY
DISCORD_ANALYTICS_WEBHOOK_URL
ADMIN_WEBHOOK_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL
```

## Steps for Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. For each variable name above:
   - Add the variable name
   - Copy the corresponding value from your `.env.local` file
   - Set it for Production, Preview, and Development environments
5. **IMPORTANT**: For `RESEND_API_KEY`, you need a VALID key from https://resend.com/api-keys
6. After adding all variables, redeploy your application

## Steps for Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings → Environment variables
4. For each variable name above:
   - Add the variable name
   - Copy the corresponding value from your `.env.local` file
5. **IMPORTANT**: For `RESEND_API_KEY`, you need a VALID key from https://resend.com/api-keys
6. Trigger a new deploy

## Getting a Valid Resend API Key

The current `RESEND_API_KEY` in your `.env.local` appears to be invalid. To fix this:

1. Log in to https://resend.com
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)
5. Update it in BOTH:
   - Your local `.env.local` file
   - Your production environment variables
6. **Verify your domain** `afropitchplay.best` in Resend to send emails from `contact@afropitchplay.best`

## Testing

After setting environment variables and redeploying:
1. Clear browser cache or use incognito mode
2. Try sending a message from admin dashboard
3. Check browser console for any errors
4. Verify email is sent successfully

## Security Note

- Never commit `.env.local` to GitHub (it's already in `.gitignore`)
- Never share your API keys publicly
- Rotate keys immediately if they are ever exposed
