-- Function to get top playlists by submission clicks
create or replace function public.get_top_playlists_by_clicks(limit_count int default 5)
returns table (
  playlist_id uuid,
  playlist_name text,
  curator_name text,
  total_clicks bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    s.playlist_id,
    p.name as playlist_name,
    pr.full_name as curator_name,
    sum(coalesce(s.clicks, 0)) as total_clicks
  from public.submissions s
  join public.playlists p on s.playlist_id = p.id
  left join public.profiles pr on p.curator_id = pr.id
  group by s.playlist_id, p.name, pr.full_name
  order by total_clicks desc
  limit limit_count;
end;
$$;

grant execute on function public.get_top_playlists_by_clicks(int) to anon, authenticated, service_role;
