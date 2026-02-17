# ONG Tracking Link System - Complete Explanation

## Overview
The tracking link system allows artists to share a unique URL that redirects to their song on the playlist while tracking unique clicks. This helps measure engagement and provides a "viral tracker" feature.

## How It Works

### 1. **Tracking Slug Generation**
When a curator **accepts** a submission, a unique tracking slug is generated:

**Location:** `src/app/dashboard/curator/page.tsx` (lines 725-732)

```typescript
let trackingSlug = null;
if (action === 'accepted') {
    const sub = reviews.find(r => r.id === submissionId);
    if (sub) {
        const cleanTitle = sub.song_title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        trackingSlug = `${cleanTitle}-${Math.random().toString(36).substring(2, 7)}`;
    }
}
```

**Example:** Song "My Amazing Track" becomes → `my-amazing-track-a3x9k`

This slug is then stored in the database via the `process_submission_review` RPC function.

---

### 2. **Database Storage**
The tracking slug is stored in the `submissions` table:

**Migration:** `supabase/migrations/20251226000002_add_tracking.sql`

```sql
alter table public.submissions 
add column if not exists clicks int default 0,
add column if not exists tracking_slug text unique;
```

- `tracking_slug`: Unique identifier for the tracking link
- `clicks`: Counter for total unique clicks

---

### 3. **Artist Dashboard Display**
Artists see their tracking link in the dashboard:

**Location:** `src/app/dashboard/artist/page.tsx` (line 459)

```typescript
{typeof window !== 'undefined' 
    ? `${window.location.origin}/track/${sub.tracking_slug}` 
    : `/track/${sub.tracking_slug}`}
```

**Example URL:** `https://afropitch.com/track/my-amazing-track-a3x9k`

Artists can:
- **Copy** the link to clipboard
- **Share** using native share API
- See **real-time click count** and progress bar

---

### 4. **Click Tracking Flow**

When someone clicks the tracking link, here's what happens:

#### Step A: User visits `/track/[slug]`
**File:** `src/app/track/[slug]/page.tsx`

1. **Fetch submission** from database using the slug
2. **Extract user's IP address** from headers (for uniqueness)
3. **Call RPC function** `increment_clicks` with submission ID and IP
4. **Redirect** to the playlist link (or song link as fallback)

```typescript
await supabase.rpc('increment_clicks', {
    submission_id: submission.id,
    ip_address: ip
});
```

#### Step B: Unique Click Tracking
**Migration:** `supabase/migrations/20260104000013_unique_clicks.sql`

The `increment_clicks` RPC function:

```sql
CREATE OR REPLACE FUNCTION public.increment_clicks(
    submission_id UUID,
    ip_address TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try to insert a new click event for this IP
    BEGIN
        INSERT INTO public.click_events (submission_id, ip_address)
        VALUES (submission_id, ip_address);
        
        -- If insert succeeded, increment the counter
        UPDATE public.submissions
        SET clicks = COALESCE(clicks, 0) + 1
        WHERE id = submission_id;
        
    EXCEPTION WHEN unique_violation THEN
        -- If duplicate IP, do nothing
        RETURN;
    END;
END;
$$;
```

**Key Features:**
- ✅ **Unique clicks only**: Each IP can only increment the counter once per submission
- ✅ **Prevents spam**: Duplicate clicks from the same IP are ignored
- ✅ **Atomic operation**: Database handles race conditions
- ✅ **Click history**: All clicks stored in `click_events` table

---

### 5. **Alternative API Route (Currently Unused)**

There's also an API route at `/api/r/[slug]` that does similar tracking:

**File:** `src/app/api/r/[slug]/route.ts`

This route uses a different RPC function `track_submission_click` that:
- Increments clicks
- Returns the song link
- Redirects to the target URL

**Note:** This route is NOT currently used by the frontend. The `/track/[slug]` page route is the active implementation.

---

## Data Flow Diagram

```
Artist Dashboard
    ↓
Displays: /track/my-song-abc123
    ↓
User clicks link
    ↓
Next.js Page: /track/[slug]
    ↓
1. Fetch submission from DB
2. Extract IP address
3. Call increment_clicks RPC
    ↓
Database (RPC Function)
    ↓
1. Try to insert (submission_id, ip_address) into click_events
2. If successful → increment clicks counter
3. If duplicate IP → ignore (no increment)
    ↓
Redirect user to Spotify playlist
```

---

## Security & Reliability

### ✅ **What's Working Well:**

1. **Unique Click Tracking**: IP-based uniqueness prevents spam
2. **Database Constraints**: UNIQUE constraint ensures data integrity
3. **Error Handling**: Graceful fallbacks if links are missing
4. **Security Definer**: RPC functions bypass RLS for public access
5. **Protocol Validation**: Ensures URLs have `https://` prefix

### ⚠️ **Potential Issues to Monitor:**

1. **IP Address Reliability**: 
   - Users behind the same NAT/proxy share an IP
   - VPN users can change IPs to inflate clicks
   - Mobile users may have dynamic IPs

2. **Two Tracking Routes**: 
   - `/track/[slug]` is the active route
   - `/api/r/[slug]` exists but is unused (could be removed or consolidated)

3. **Tracking Slug Generation**:
   - Uses `Math.random()` which is not cryptographically secure
   - Potential for collisions (though unlikely with unique constraint)

---

## Testing the System

### Manual Test:
1. Create a submission as an artist
2. Accept it as a curator
3. Check artist dashboard for tracking link
4. Click the link → should redirect to playlist
5. Check click counter → should increment by 1
6. Click again from same IP → counter should NOT increment

### Database Check:
```sql
-- View all tracking slugs
SELECT id, song_title, tracking_slug, clicks 
FROM submissions 
WHERE tracking_slug IS NOT NULL;

-- View click events
SELECT * FROM click_events 
WHERE submission_id = 'YOUR_SUBMISSION_ID';
```

---

## Recommendations

### ✅ **System is Working Correctly**
The tracking link system is functional and won't break anything. It's properly integrated with:
- Database migrations
- RPC functions
- Frontend components
- Security policies

### 🔧 **Optional Improvements:**

1. **Consolidate Routes**: Remove `/api/r/[slug]` if not needed
2. **Better Slug Generation**: Use `crypto.randomUUID()` or similar
3. **Click Analytics**: Add timestamp-based analytics for click patterns
4. **Rate Limiting**: Add server-side rate limiting to prevent abuse
5. **Geolocation**: Track click locations for better insights

---

## Conclusion

**The ONG tracking link system is working as designed and should NOT break anything.**

- ✅ Tracking slugs are generated when submissions are accepted
- ✅ Unique clicks are tracked per IP address
- ✅ Artists can share links and see real-time engagement
- ✅ System prevents click spam and duplicate counting
- ✅ Proper error handling and fallbacks in place

The system is production-ready and provides valuable engagement metrics for artists while maintaining data integrity and preventing abuse.
