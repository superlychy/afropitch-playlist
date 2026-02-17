-- Email Notification Diagnostic Script
-- Run this in Supabase SQL Editor to verify webhook triggers are configured correctly

-- ============================================================================
-- 1. CHECK ACTIVE TRIGGERS
-- ============================================================================

SELECT 
    '=== ACTIVE TRIGGERS ===' as section,
    trigger_name,
    event_manipulation as event,
    event_object_table as table_name,
    action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('submissions', 'transactions', 'withdrawals', 'broadcasts', 'support_tickets', 'profiles', 'playlists')
ORDER BY event_object_table, trigger_name;

-- Expected triggers for USER notifications (notify-user webhook):
-- ✅ on_broadcast_insert (broadcasts, INSERT)
-- ✅ on_transaction_insert (transactions, INSERT) <- THIS WAS MISSING
-- ✅ on_submission_update (submissions, UPDATE)
-- ✅ on_withdrawal_update (withdrawals, UPDATE)
-- ✅ on_ticket_update (support_tickets, UPDATE)

-- Expected triggers for ADMIN notifications (notify-admin webhook):
-- ✅ on_profile_change_admin (profiles, INSERT/UPDATE)
-- ✅ on_submission_created_admin (submissions, INSERT)
-- ✅ on_playlist_created_admin (playlists, INSERT)
-- ❌ on_transaction_created_admin <- SHOULD BE REMOVED (was causing duplicates)
-- ✅ on_ticket_created_admin (support_tickets, INSERT)

-- ============================================================================
-- 2. CHECK FOR DUPLICATE TRIGGERS
-- ============================================================================

SELECT 
    '=== DUPLICATE TRIGGERS CHECK ===' as section,
    event_object_table,
    event_manipulation,
    COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, event_manipulation
HAVING COUNT(*) > 1;

-- Should return NO rows (no duplicates)

-- ============================================================================
-- 3. VERIFY WEBHOOK FUNCTIONS EXIST
-- ============================================================================

SELECT 
    '=== WEBHOOK FUNCTIONS ===' as section,
    proname as function_name,
    pg_get_functiondef(oid) LIKE '%notify-user%' as is_user_webhook,
    pg_get_functiondef(oid) LIKE '%notify-admin%' as is_admin_webhook
FROM pg_proc
WHERE proname IN ('notify_user_webhook', 'trigger_notify_admin')
  AND pronamespace = 'public'::regnamespace;

-- Should see both functions

-- ============================================================================
-- 4. CHECK RECENT WEBHOOK ACTIVITY
-- ============================================================================

SELECT 
    '=== RECENT WEBHOOK CALLS ===' as section,
    id,
    created_at,
    status_code,
    CASE 
        WHEN status_code = 200 THEN '✅ Success'
        WHEN status_code >= 400 THEN '❌ Error'
        ELSE '⚠️ Unknown'
    END as status,
    content::text as response
FROM net._http_response
ORDER BY created_at DESC
LIMIT 10;

-- All should have status_code = 200

-- ============================================================================
-- 5. CHECK RECENT SUBMISSIONS AND TRANSACTIONS
-- ============================================================================

SELECT 
    '=== RECENT ACCEPTED SUBMISSIONS ===' as section,
    s.id,
    s.song_title,
    s.status,
    s.tracking_slug,
    s.updated_at,
    t.id as transaction_id,
    t.type as transaction_type,
    t.amount as transaction_amount,
    t.created_at as transaction_created_at
FROM submissions s
LEFT JOIN transactions t ON t.related_submission_id = s.id
WHERE s.status = 'accepted'
ORDER BY s.updated_at DESC
LIMIT 5;

-- Each accepted submission should have a corresponding transaction

-- ============================================================================
-- 6. VERIFY ARTIST EMAIL ADDRESSES
-- ============================================================================

SELECT 
    '=== ARTIST EMAIL VERIFICATION ===' as section,
    p.id,
    p.full_name,
    au.email,
    au.email_confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Verified'
        ELSE '❌ Not Verified'
    END as email_status
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role = 'artist'
ORDER BY p.created_at DESC
LIMIT 10;

-- Artists must have verified emails to receive notifications

-- ============================================================================
-- 7. TEST WEBHOOK MANUALLY (OPTIONAL)
-- ============================================================================

-- Uncomment and run this to test the webhook manually
-- Replace SUBMISSION_ID with an actual submission ID

/*
DO $$
DECLARE
    test_submission_id uuid := 'YOUR_SUBMISSION_ID_HERE';
BEGIN
    -- Simulate a submission update
    UPDATE submissions
    SET updated_at = NOW()
    WHERE id = test_submission_id;
    
    RAISE NOTICE 'Webhook should have fired. Check net._http_response table.';
END $$;
*/

-- ============================================================================
-- 8. SUMMARY
-- ============================================================================

SELECT 
    '=== DIAGNOSTIC SUMMARY ===' as section,
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE trigger_schema = 'public' 
       AND event_object_table = 'transactions' 
       AND trigger_name = 'on_transaction_insert') as transaction_trigger_exists,
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE trigger_schema = 'public' 
       AND event_object_table = 'transactions' 
       AND trigger_name = 'on_transaction_created_admin') as duplicate_admin_trigger_exists,
    (SELECT COUNT(*) FROM net._http_response 
     WHERE created_at > NOW() - INTERVAL '1 hour') as webhooks_last_hour,
    (SELECT COUNT(*) FROM submissions 
     WHERE status = 'accepted' 
       AND updated_at > NOW() - INTERVAL '1 day') as accepted_submissions_today;

-- Expected:
-- transaction_trigger_exists: 1 ✅
-- duplicate_admin_trigger_exists: 0 ✅
-- webhooks_last_hour: (varies)
-- accepted_submissions_today: (varies)
