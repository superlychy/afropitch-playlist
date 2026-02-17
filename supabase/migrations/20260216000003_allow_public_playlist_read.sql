-- Migration: Allow Public Read Access to Playlists
-- Created: 2026-02-16
-- Purpose: Enable anonymous users to view playlists for tracking link redirects

-- ============================================================================
-- ALLOW PUBLIC READ ACCESS TO PLAYLISTS
-- ============================================================================

-- This is needed for the /track/[slug] page to access playlist.playlist_link
-- Playlists are public by nature (they're Spotify playlists), so this is safe

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'playlists' 
        AND policyname = 'Public can view playlists'
    ) THEN
        CREATE POLICY "Public can view playlists"
        ON public.playlists
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;
