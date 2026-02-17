-- Create RPC function to retrieve Discord Webhook URL securely from Vault
CREATE OR REPLACE FUNCTION public.get_discord_webhook()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_val text;
BEGIN
  -- Only allow if role is service_role (Edge Functions default)
  IF (current_user = 'postgres' OR auth.role() = 'service_role') THEN
      SELECT decrypted_secret INTO secret_val 
      FROM vault.decrypted_secrets 
      WHERE name = 'DISCORD_RESEND_WEBHOOK_URL'
      LIMIT 1;
      
      RETURN secret_val;
  ELSE
      RAISE EXCEPTION 'Access Denied: Only service_role can access this secret.';
  END IF;
END;
$$;

-- Grant access to authenticated users (so Edge Function can call it via service_role context)
GRANT EXECUTE ON FUNCTION public.get_discord_webhook() TO service_role;
