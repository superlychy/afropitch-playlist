-- Homepage partner spotlight (2026-10-12).
-- One curated slot, ships OFF. Same pattern as the events partner banner:
-- the admin flips it on only when a partnership deal goes live.

INSERT INTO site_settings (key, value) VALUES
    ('spotlight_enabled', 'false'),
    ('spotlight_label', '"Partner"'),
    ('spotlight_headline', 'null'),
    ('spotlight_subtext', 'null'),
    ('spotlight_image_url', 'null'),
    ('spotlight_link_url', 'null')
ON CONFLICT (key) DO NOTHING;
