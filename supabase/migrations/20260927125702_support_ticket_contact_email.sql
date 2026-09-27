-- Allow anonymous (not logged in) visitors to open support tickets from the help chat widget.
alter table public.support_tickets add column if not exists contact_email text;
