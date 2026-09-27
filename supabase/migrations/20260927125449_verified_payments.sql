-- Server-side Paystack verification for mixing orders.
-- verified_payments is written only by the service role (API route); RLS has no public policies.
create table if not exists public.verified_payments (
    reference text primary key,
    amount numeric not null,
    currency text not null default 'NGN',
    verified_at timestamptz not null default now(),
    used_at timestamptz,
    order_id uuid
);
alter table public.verified_payments enable row level security;
