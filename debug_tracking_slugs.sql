-- Debug script to check tracking slugs
-- Run this in Supabase SQL Editor to see if tracking slugs are being saved

-- 1. Check all submissions with their tracking slugs
SELECT 
    id,
    song_title,
    status,
    tracking_slug,
    clicks,
    created_at,
    updated_at
FROM public.submissions
WHERE status = 'accepted'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. Check if any tracking slugs exist at all
SELECT COUNT(*) as total_accepted, 
       COUNT(tracking_slug) as with_tracking_slug,
       COUNT(*) - COUNT(tracking_slug) as missing_tracking_slug
FROM public.submissions
WHERE status = 'accepted';

-- 3. Check the most recent accepted submission
SELECT *
FROM public.submissions
WHERE status = 'accepted'
ORDER BY updated_at DESC
LIMIT 1;
