# 🎯 Tracking Link System - Quick Reference

## 🔗 What Are Tracking Links?

Tracking links are unique URLs that artists can share to promote their accepted songs. Each click is tracked, and artists can see their engagement metrics in real-time.

**Example:** `https://afropitchplay.best/track/my-amazing-song-a3x9k`

---

## 🎬 How It Works (Simple Version)

1. **Curator accepts song** → System generates unique tracking slug
2. **Artist receives email** → Contains tracking link
3. **Artist shares link** → On social media, with friends, etc.
4. **People click link** → Redirects to Spotify + tracks unique clicks
5. **Artist sees results** → Real-time click counter in dashboard

---

## 📍 Where to Find Tracking Links

### Artist Dashboard (`/dashboard/artist`)
- Look for accepted submissions
- Each accepted song has a "Viral Tracker" section
- Shows:
  - ✅ Tracking link (copy/share buttons)
  - ✅ Click counter
  - ✅ Progress bar (0-100 clicks)
  - ✅ Challenge: "Get 100 clicks to unlock Local Trending status"

### Email Notification
- Subject: "Congratulations! Your song was approved..."
- Contains tracking link in email body
- Click to test or share

---

## 🛠️ Technical Details

### URL Structure
```
https://afropitchplay.best/track/[tracking-slug]
                                  └─ Unique identifier
```

### Tracking Slug Format
```
song-title-abc123
└─ Song title (cleaned) + 5 random characters
```

### Database Tables

**submissions**
```sql
- id (uuid)
- song_title (text)
- tracking_slug (text, unique)  ← Generated on acceptance
- clicks (int)                   ← Incremented on unique clicks
- status (text)                  ← 'accepted' to get tracking slug
```

**click_events**
```sql
- id (uuid)
- submission_id (uuid)           ← Links to submission
- ip_address (text)              ← For uniqueness
- created_at (timestamp)
- UNIQUE(submission_id, ip_address)  ← Prevents duplicates
```

---

## 🔐 Security Features

### 1. Unique Click Tracking
- Each IP address can only increment counter once
- Prevents spam/inflation
- Uses database UNIQUE constraint

### 2. Row Level Security (RLS)
- Anonymous users can only access submissions with tracking_slug
- No sensitive data exposed (amount_paid, artist_id, etc.)
- Only public data: song_link, playlist_link, clicks

### 3. Safe Redirects
- URL validation (ensures https://)
- Graceful error handling
- No XSS vulnerabilities

---

## 📊 Key Metrics

### For Artists
- **Clicks**: Total unique clicks on tracking link
- **Progress**: Path to "Local Trending" (100 clicks)
- **Engagement**: See which songs are performing best

### For Curators
- Can see submission clicks in playlist management
- Helps identify popular tracks
- Can boost rankings for trending songs

---

## 🚨 Common Issues & Solutions

### Issue: "Link Expired" Error
**Solution:** RLS policies were missing. Fixed with migrations:
- `20260216000002_fix_tracking_link_access.sql`
- `20260216000003_allow_public_playlist_read.sql`

### Issue: Clicks Not Counting
**Cause:** Same IP clicking multiple times
**Solution:** This is expected behavior (prevents spam)

### Issue: Link Not Showing in Dashboard
**Cause:** Submission not accepted yet
**Solution:** Curator must accept submission first

---

## 🔧 Developer Commands

### Check RLS Policies
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('submissions', 'playlists');
```

### View Recent Tracking Activity
```sql
SELECT 
    s.song_title,
    s.tracking_slug,
    s.clicks,
    COUNT(ce.id) as total_click_events
FROM submissions s
LEFT JOIN click_events ce ON s.id = ce.submission_id
WHERE s.status = 'accepted'
GROUP BY s.id, s.song_title, s.tracking_slug, s.clicks
ORDER BY s.clicks DESC
LIMIT 10;
```

### Test Tracking Link Manually
```sql
-- Simulate a click
SELECT increment_clicks(
    'SUBMISSION_ID'::uuid,
    '192.168.1.100'  -- Test IP
);

-- Check if it worked
SELECT clicks FROM submissions WHERE id = 'SUBMISSION_ID';
```

### Debug Specific Tracking Link
```sql
SELECT 
    s.id,
    s.song_title,
    s.tracking_slug,
    s.clicks,
    s.status,
    p.name as playlist_name,
    p.playlist_link
FROM submissions s
LEFT JOIN playlists p ON s.playlist_id = p.id
WHERE s.tracking_slug = 'YOUR-SLUG-HERE';
```

---

## 📁 Related Files

### Frontend
- `src/app/track/[slug]/page.tsx` - Tracking page (redirects to Spotify)
- `src/app/dashboard/artist/page.tsx` - Artist dashboard (shows tracking links)
- `src/app/dashboard/curator/page.tsx` - Curator dashboard (generates slugs)

### Backend
- `supabase/migrations/20251226000002_add_tracking.sql` - Initial tracking setup
- `supabase/migrations/20260104000013_unique_clicks.sql` - Unique click tracking
- `supabase/migrations/20260216000002_fix_tracking_link_access.sql` - RLS fix
- `supabase/functions/notify-user/index.ts` - Email notifications

### Database Functions
- `increment_clicks(submission_id, ip_address)` - Tracks unique clicks
- `process_submission_review(...)` - Accepts/declines submissions, generates slugs

---

## 🎨 UI Components

### Viral Tracker Card (Artist Dashboard)
```tsx
<div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30">
  <div className="flex items-center justify-between">
    <p className="text-green-400">🔥 Viral Tracker</p>
    <span className="text-white bg-green-500/20">{clicks} Clicks</span>
  </div>
  
  {/* Progress Bar */}
  <div className="h-2 bg-black/50 rounded-full">
    <div className="h-full bg-gradient-to-r from-green-600 to-green-400"
         style={{ width: `${(clicks / 100) * 100}%` }} />
  </div>
  
  {/* Tracking Link */}
  <div className="flex items-center gap-2">
    <input value="/track/song-slug-abc123" readOnly />
    <button onClick={copyToClipboard}>📋 Copy</button>
    <button onClick={share}>🔗 Share</button>
  </div>
</div>
```

---

## 📈 Future Enhancements

### Potential Improvements
1. **Analytics Dashboard**
   - Click-through rate over time
   - Geographic distribution of clicks
   - Peak engagement times

2. **Rewards System**
   - Unlock badges at milestones (100, 500, 1000 clicks)
   - Leaderboard for most-clicked songs
   - Bonus features for viral tracks

3. **Advanced Tracking**
   - UTM parameters for source tracking
   - Referrer analysis
   - Device/browser breakdown

4. **Social Sharing**
   - Pre-made social media graphics
   - One-click share to Twitter/Instagram
   - Embed codes for websites

---

## 📞 Support

### For Users
- Check dashboard for tracking link
- Email must be verified to receive notifications
- Contact support if link not working

### For Developers
- Check `.gemini/tracking_link_fix_summary.md` for detailed explanation
- Review `.gemini/tracking_link_testing_checklist.md` for testing
- Check Supabase logs for errors

---

## ✅ Status: FIXED & WORKING

**Last Updated:** 2026-02-16

**Changes Made:**
- ✅ Added RLS policy for public submission access
- ✅ Added RLS policy for public playlist access
- ✅ Verified tracking slug generation
- ✅ Tested click tracking
- ✅ Confirmed email notifications

**Result:** Tracking links are now fully functional! 🎉
