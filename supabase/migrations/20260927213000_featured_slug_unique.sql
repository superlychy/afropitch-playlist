-- Published featured-artist slugs must be unique: the public page
-- (/featured/[slug]) uses maybeSingle(), so duplicate published slugs
-- break the page with a 406. Drafts may share slugs while being edited,
-- hence the partial index.
create unique index if not exists featured_artists_published_slug_unique
  on public.featured_artists (slug)
  where status = 'published';
