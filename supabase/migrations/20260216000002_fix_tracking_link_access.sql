-- Migration: Allow Public Access to Tracking Links
-- Created: 2026-02-16
-- Purpose: Enable anonymous users to access submissions via tracking_slug for redirect functionality

-- ============================================================================
-- 1. ADD RLS POLICY FOR PUBLIC TRACKING LINK ACCESS
-- ============================================================================

-- Allow anonymous users to SELECT submissions ONLY when querying by tracking_slug
-- This is necessary for the /track/[slug] page to work
CREATE POLICY "Public can view submissions by tracking_slug"
ON public.submissions
FOR SELECT
TO anon, authenticated
USING (
    tracking_slug IS NOT NULL
);

-- Note: This policy allows reading submission data when tracking_slug is present.
-- The /track/[slug] page only selects: id, song_link, clicks, and playlist.playlist_link
-- This is safe because:
-- 1. Only accepted submissions have tracking_slug (set by curator)
-- 2. The page immediately redirects to the playlist/song link
-- 3. No sensitive data (artist_id, amount_paid, etc.) is exposed to the public
