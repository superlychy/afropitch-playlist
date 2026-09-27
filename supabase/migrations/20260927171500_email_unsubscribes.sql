-- Broadcast unsubscribe handling.
-- Vault secret UNSUBSCRIBE_SECRET must exist (created via vault.create_secret).

create table if not exists public.email_unsubscribes (
    email text primary key,
    created_at timestamptz default now(),
    source text default 'broadcast'
);
alter table public.email_unsubscribes enable row level security;

-- Service-role-only accessor for the unsubscribe signing secret,
-- mirroring get_discord_webhook().
CREATE OR REPLACE FUNCTION public.get_unsubscribe_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    secret_val text;
BEGIN
    IF (current_user = 'postgres' OR auth.role() = 'service_role') THEN
        SELECT decrypted_secret INTO secret_val
        FROM vault.decrypted_secrets
        WHERE name = 'UNSUBSCRIBE_SECRET'
        LIMIT 1;
        RETURN secret_val;
    ELSE
        RAISE EXCEPTION 'Access Denied: Only service_role can access this secret.';
    END IF;
END
$function$;
