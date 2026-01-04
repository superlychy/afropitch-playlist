
create or replace function increment_clicks(submission_id uuid)
returns void as $$
begin
  update public.submissions
  set clicks = clicks + 1
  where id = submission_id;
end;
$$ language plpgsql security definer;
