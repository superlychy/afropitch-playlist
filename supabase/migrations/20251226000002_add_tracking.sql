-- 1. Add tracking columns to submissions
alter table public.submissions 
add column if not exists clicks int default 0,
add column if not exists tracking_slug text unique;

-- 2. Create RPC function for secure tracking
-- This function increments the clicks count and returns the song_link for the redirect.
-- It bypasses RLS because it's a security definer function (executes with permissions of the creator, usually postgres/admin)
-- OR we can grant execute to public.
create or replace function public.track_submission_click(slug_input text)
returns text
language plpgsql
security definer
as $$
declare
  target_link text;
begin
  -- Update the clicks count
  update public.submissions
  set clicks = clicks + 1
  where tracking_slug = slug_input
  returning song_link into target_link;

  return target_link;
end;
$$;

-- Allow public (anon) and authenticated users to call this function
grant execute on function public.track_submission_click(text) to anon, authenticated, service_role;
