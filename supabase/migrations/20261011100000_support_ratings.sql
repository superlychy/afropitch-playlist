-- One rating per support ticket, given by the visitor after the admin
-- closes the conversation. Written via the service-role API route only.
create table if not exists public.support_ratings (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique(ticket_id)
);

alter table public.support_ratings enable row level security;
