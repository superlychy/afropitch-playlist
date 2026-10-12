-- Partner placement + presale badge system (2026-10-12).
-- Everything ships OFF. The admin flips the switches when a partnership goes live.

-- 1. Global switches, readable by the public site, writable by admins only.
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings"
    ON site_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY "Admins can manage site settings"
    ON site_settings FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Seed both switches OFF. The banner has no event selected yet.
INSERT INTO site_settings (key, value) VALUES
    ('partner_banner_enabled', 'false'),
    ('partner_banner_event_id', 'null'),
    ('presale_badge_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 2. Per-event presale flag. The badge shows only when the global
-- presale_badge_enabled switch is on AND the event is flagged.
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_presale BOOLEAN NOT NULL DEFAULT false;
