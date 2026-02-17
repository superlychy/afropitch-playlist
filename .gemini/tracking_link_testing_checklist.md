# Tracking Link Testing Checklist

## ✅ Pre-Test Setup

### 1. Verify Migrations Applied
Run this in Supabase SQL Editor to confirm policies exist:

```sql
-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('submissions', 'playlists')
ORDER BY tablename, policyname;
```

Expected results:
- ✅ `Public can view submissions by tracking_slug` on submissions table
- ✅ `Public can view playlists` on playlists table

### 2. Check Existing Data
```sql
-- See if you have any accepted submissions with tracking slugs
SELECT 
    id,
    song_title,
    status,
    tracking_slug,
    clicks,
    created_at
FROM public.submissions
WHERE status = 'accepted'
ORDER BY updated_at DESC
LIMIT 5;
```

---

## 🧪 Test Scenario 1: Accept New Submission

### Steps:
1. **Login as Curator**
   - Go to `/dashboard/curator`
   - Find a pending submission

2. **Accept the Submission**
   - Click "Accept" button
   - Verify success message appears
   - Note the song title

3. **Verify Database Update**
   ```sql
   SELECT 
       song_title,
       status,
       tracking_slug,
       clicks
   FROM public.submissions
   WHERE song_title = 'YOUR_SONG_TITLE'
   ORDER BY updated_at DESC
   LIMIT 1;
   ```
   - ✅ Status should be 'accepted'
   - ✅ tracking_slug should NOT be null
   - ✅ tracking_slug format: `song-title-xxxxx` (5 random chars)
   - ✅ clicks should be 0

4. **Check Artist Dashboard**
   - Login as the artist who submitted the song
   - Go to `/dashboard/artist`
   - Find the accepted submission
   - ✅ Should see "Viral Tracker" section
   - ✅ Should see tracking link: `/track/song-title-xxxxx`
   - ✅ Should see "0 Clicks" counter
   - ✅ Progress bar should show 0/100

5. **Check Email**
   - Artist should receive email with subject: "Congratulations! Your song was approved..."
   - ✅ Email should contain tracking link
   - ✅ Link should be: `https://afropitchplay.best/track/song-title-xxxxx`

---

## 🧪 Test Scenario 2: Click Tracking Link (Anonymous User)

### Steps:
1. **Copy Tracking Link**
   - From artist dashboard, copy the full tracking link
   - Example: `https://afropitchplay.best/track/my-song-a3x9k`

2. **Open in Incognito/Private Window**
   - This simulates an anonymous user (not logged in)
   - Paste the tracking link
   - Press Enter

3. **Expected Behavior**
   - ✅ Page should load briefly (< 1 second)
   - ✅ Should redirect to Spotify playlist
   - ✅ NO "Link Expired" error
   - ✅ NO "Invalid Link" error
   - ✅ Should land on Spotify (open.spotify.com)

4. **Verify Click Was Tracked**
   - Go back to artist dashboard
   - Refresh the page
   - ✅ Clicks counter should now show "1 Clicks"
   - ✅ Progress bar should show 1/100

5. **Check Database**
   ```sql
   -- Verify click was recorded
   SELECT * FROM public.click_events
   WHERE submission_id = 'YOUR_SUBMISSION_ID'
   ORDER BY created_at DESC;
   ```
   - ✅ Should see 1 row with your IP address

---

## 🧪 Test Scenario 3: Duplicate Click Prevention

### Steps:
1. **Click Same Link Again**
   - From the same browser/IP
   - Click the tracking link again

2. **Expected Behavior**
   - ✅ Should still redirect to Spotify
   - ✅ NO error messages

3. **Verify Click NOT Counted**
   - Go back to artist dashboard
   - Refresh the page
   - ✅ Clicks counter should STILL show "1 Clicks" (not 2)
   - ✅ Progress bar should still show 1/100

4. **Check Database**
   ```sql
   SELECT COUNT(*) as click_count
   FROM public.click_events
   WHERE submission_id = 'YOUR_SUBMISSION_ID';
   ```
   - ✅ Should still be 1 (not 2)

---

## 🧪 Test Scenario 4: Multiple Unique IPs

### Steps:
1. **Click from Different Device/Network**
   - Use mobile phone (on cellular data, not WiFi)
   - Or use VPN to change IP
   - Click the tracking link

2. **Expected Behavior**
   - ✅ Should redirect to Spotify
   - ✅ Clicks counter should increment to 2

3. **Verify in Database**
   ```sql
   SELECT 
       ip_address,
       created_at
   FROM public.click_events
   WHERE submission_id = 'YOUR_SUBMISSION_ID'
   ORDER BY created_at;
   ```
   - ✅ Should see 2 rows with different IP addresses

---

## 🧪 Test Scenario 5: Share Functionality

### Steps:
1. **Test Copy Button**
   - In artist dashboard, click the "Copy" button next to tracking link
   - ✅ Should show alert: "Tracker Link copied! Share it now."
   - ✅ Paste in notepad - should be full URL

2. **Test Share Button** (Mobile Only)
   - On mobile device, click the "Share" button
   - ✅ Should open native share dialog
   - ✅ Should include title: "Listen to my song on AfroPitch!"
   - ✅ Should include the tracking URL

---

## 🧪 Test Scenario 6: Email Link Click

### Steps:
1. **Find Approval Email**
   - Check artist's email inbox
   - Find "Congratulations! Your song was approved..." email

2. **Click Link in Email**
   - Click the tracking link in the email body
   - ✅ Should redirect to Spotify
   - ✅ Should increment click counter (if from new IP)

---

## 🧪 Test Scenario 7: Edge Cases

### Test 7A: Invalid Slug
1. Visit: `https://afropitchplay.best/track/invalid-slug-12345`
2. ✅ Should show "Link Expired" error page
3. ✅ Should NOT crash or show 500 error

### Test 7B: Missing Slug
1. Visit: `https://afropitchplay.best/track/`
2. ✅ Should show "Invalid Link" error page

### Test 7C: Submission Without Playlist Link
1. Create a submission and accept it
2. Manually remove playlist_link from database:
   ```sql
   UPDATE public.playlists
   SET playlist_link = NULL
   WHERE id = 'PLAYLIST_ID';
   ```
3. Click tracking link
4. ✅ Should show "Destination Missing" error
5. ✅ Should NOT crash

---

## 🧪 Test Scenario 8: Performance

### Steps:
1. **Measure Redirect Speed**
   - Open browser DevTools → Network tab
   - Click tracking link
   - ✅ Initial page load should be < 500ms
   - ✅ Redirect should be < 100ms
   - ✅ Total time to Spotify should be < 1 second

2. **Test Under Load**
   - Click tracking link 10 times rapidly
   - ✅ Should handle all requests without errors
   - ✅ Click counter should only increment once (same IP)

---

## 📊 Success Criteria

### All Tests Must Pass:
- ✅ Tracking slug generated when submission accepted
- ✅ Tracking slug saved to database
- ✅ Tracking link displayed in artist dashboard
- ✅ Tracking link sent in approval email
- ✅ Anonymous users can click link (no auth required)
- ✅ Link redirects to Spotify playlist
- ✅ Clicks are tracked per unique IP
- ✅ Duplicate IPs don't increment counter
- ✅ Click count updates in real-time
- ✅ Progress bar updates correctly
- ✅ No "Link Expired" errors for valid links
- ✅ Proper error messages for invalid links
- ✅ Fast redirect performance (< 1 second)

---

## 🐛 Troubleshooting

### Issue: "Link Expired" Error
**Possible Causes:**
1. RLS policies not applied
   - Run: `SELECT * FROM pg_policies WHERE tablename = 'submissions';`
   - Should see "Public can view submissions by tracking_slug"

2. Tracking slug not saved
   - Check database: `SELECT tracking_slug FROM submissions WHERE id = 'X';`
   - Should NOT be null for accepted submissions

3. Wrong URL format
   - Should be: `/track/slug` not `/r/slug`

### Issue: Clicks Not Incrementing
**Possible Causes:**
1. Same IP clicking multiple times
   - Check: `SELECT * FROM click_events WHERE submission_id = 'X';`
   - Each IP should only appear once

2. RPC function not working
   - Test manually:
   ```sql
   SELECT increment_clicks('SUBMISSION_ID', '1.2.3.4');
   ```

### Issue: Redirect Not Working
**Possible Causes:**
1. Playlist link missing
   - Check: `SELECT playlist_link FROM playlists WHERE id = 'X';`

2. Invalid URL format
   - Playlist link should start with `http://` or `https://`

---

## 📝 Test Results Template

```
Date: _________________
Tester: _______________

Test Scenario 1: Accept New Submission
[ ] Tracking slug generated
[ ] Database updated correctly
[ ] Link shown in dashboard
[ ] Email sent with link

Test Scenario 2: Click Tracking Link
[ ] Redirects to Spotify
[ ] No errors
[ ] Click counted

Test Scenario 3: Duplicate Click Prevention
[ ] Second click doesn't increment counter

Test Scenario 4: Multiple Unique IPs
[ ] Different IPs increment counter

Test Scenario 5: Share Functionality
[ ] Copy button works
[ ] Share button works (mobile)

Test Scenario 6: Email Link Click
[ ] Email link works

Test Scenario 7: Edge Cases
[ ] Invalid slug shows error
[ ] Missing slug shows error
[ ] Missing playlist link shows error

Test Scenario 8: Performance
[ ] Redirect is fast (< 1 second)

Overall Result: PASS / FAIL
Notes: _________________________________
```

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark feature as complete
2. ✅ Update documentation
3. ✅ Announce to users

If tests fail:
1. Document which test failed
2. Check error logs
3. Review RLS policies
4. Verify database data
5. Contact support if needed
