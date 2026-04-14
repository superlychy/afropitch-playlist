# AfroPitch — Deployment Guide (Post-Update)

## What Changed

### Critical Fixes
1. **User registration now works automatically** — DB trigger auto-creates profiles on signup
2. **Payment flow is now atomic** — server-side API validates, deducts wallet, and saves submissions in one shot
3. **Double-submit protection** — submit button locked during processing, ref guard prevents double-clicks
4. **Paystack stale amount fixed** — amount locked at render time with useMemo
5. **Song link validation** — only accepts Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, YouTube URLs
6. **Duplicate submission detection** — can't submit same song to same playlist twice

### UX Improvements
7. **Toast notifications everywhere** — no more browser `alert()` popups
8. **No more `window.location.reload()`** — email confirmation uses proper navigation
9. **Error feedback is immediate** — users see what went wrong right away

### Architecture
10. **Server-side submission API** (`/api/submit`) — handles all payment + DB logic atomically
11. **Idempotent deposit RPC** — won't double-credit on Paystack callback retry
12. **Optimistic balance lock** — concurrent wallet operations protected by DB-level checks

---

## Step 1: Run the Database Migration

Go to **Supabase Dashboard → SQL Editor** and run the file:

```
supabase/migrations/20260318000001_complete_setup.sql
```

This creates:
- Profile auto-creation trigger (fixes invisible users)
- `process_deposit` RPC (idempotent wallet funding)
- `process_submission_review` RPC (atomic accept/decline)
- `request_payout` RPC (atomic curator withdrawal)
- `track_submission_click` RPC (public link tracking)
- All required tables + indexes

---

## Step 2: Install Dependencies (if not done)

```bash
npm install
```

---

## Step 3: Test Locally

```bash
npm run dev
```

Test these flows:
1. **Signup** → new user should auto-appear in `profiles` table
2. **Login** → should redirect to correct dashboard
3. **Top up wallet** → Paystack popup → balance updates
4. **Submit music** → select playlists → fill form → submit → check DB
5. **Curator accepts** → artist sees "accepted" → tracker link works
6. **Curator declines** → artist gets refund → wallet balance increases

---

## Step 4: Deploy to Vercel

```bash
# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env pull .env.production

# Deploy
vercel --prod
```

Make sure these env vars are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PAYSTACK_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `DISCORD_ANALYTICS_WEBHOOK_URL`
- `ADMIN_WEBHOOK_URL`
- `ADMIN_EMAIL`

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/app/api/submit/route.ts` | **NEW** — atomic server-side submission |
| `src/components/ui/toast.tsx` | **NEW** — toast notification system |
| `src/components/PaystackButton.tsx` | Fixed stale amount with useMemo |
| `src/context/AuthContext.tsx` | Cleaner sync, removed fallback profile creation (DB trigger handles it) |
| `src/app/layout.tsx` | Added ToastProvider wrapper |
| `src/app/submit/page.tsx` | Full rewrite: server-side submit, double-submit guard, link validation, toasts |
| `src/app/dashboard/artist/page.tsx` | Toasts, atomic Paystack handler, idempotent deposit |
| `src/app/dashboard/curator/page.tsx` | Toasts replacing all alerts |
| `src/app/dashboard/admin/page.tsx` | Toasts replacing all alerts |
| `src/app/portal/page.tsx` | Toasts, removed window.location.reload() |
| `src/app/contact/page.tsx` | Toasts |
| `src/components/AdminMessageForm.tsx` | Toasts |
| `src/components/CustomEmailForm.tsx` | Toasts |
| `src/app/curators/join/page.tsx` | Toasts |
| `supabase/migrations/20260318000001_complete_setup.sql` | **NEW** — complete DB setup |
