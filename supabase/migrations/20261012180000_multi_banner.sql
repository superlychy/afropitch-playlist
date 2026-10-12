-- Multi-banner support (2026-10-12): the partner banner can now feature
-- several events as a swipeable carousel. partner_banner_event_ids holds
-- a JSON array of event ids (TEXT column). The old single-event key
-- partner_banner_event_id is kept as a fallback and ignored once the
-- array is in use.

INSERT INTO site_settings (key, value) VALUES
    ('partner_banner_event_ids', '[]')
ON CONFLICT (key) DO NOTHING;
