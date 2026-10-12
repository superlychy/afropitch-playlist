-- C5 follow-up (part 2): the public curator directory must also work for
-- LOGGED-IN users. The /curators page uses the session client, and the
-- /curators/[id] admin check runs as the session user, so the anon-only
-- policy left logged-in artists with an empty curator list. Extend the same
-- scoped directory access to the authenticated role.
--
-- Security posture is unchanged: only curator/admin rows, and only the
-- public directory columns. Emails, balances, bank details and all other
-- private columns remain inaccessible.

-- 1. Directory policy for logged-in users (mirrors the anon one).
DROP POLICY IF EXISTS "profiles_auth_curator_directory" ON public.profiles;
CREATE POLICY "profiles_auth_curator_directory"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (role IN ('curator', 'admin'));

-- 2. Column grants for the authenticated role (same safe set as anon).
GRANT SELECT (
    id,
    full_name,
    role,
    verification_status,
    bio,
    avatar_url,
    photo_url,
    instagram,
    twitter,
    tiktok,
    youtube,
    website
) ON public.profiles TO authenticated;
