-- Events: inspectable source link (Max, 2026-10-11).
-- Every event records the exact page where it was found/verified, so the
-- admin can open the source from the dashboard and confirm the listing,
-- for drafts and published events alike. The existing `source` column
-- stays as the short provenance label (e.g. "Muse research").
alter table public.events
  add column if not exists source_url text;

comment on column public.events.source_url is
  'URL of the page where this event was found/verified (ticketing listing, organizer page, or press). Shown in admin only, for verification.';
