-- Add state/province for cascading location filters (2026-10-12).
ALTER TABLE events ADD COLUMN IF NOT EXISTS state TEXT;
