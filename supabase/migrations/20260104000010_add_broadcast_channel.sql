alter table public.broadcasts 
add column if not exists channel text default 'email' check (channel in ('email', 'in_app', 'both'));
