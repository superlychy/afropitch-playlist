-- C5 follow-up fix (2026-10-12): the public /playlists and /curators pages read
-- curator directory data as anon. The initial C5 replacement removed all anon
-- reads, which blanked those pages. This restores a SCOPED anon read:
-- only curator/admin rows, only directory-safe columns. Emails, balances and
-- bank details remain unreachable for anon (no policy, no column grant).

CREATE POLICY "Anon curator directory"
  ON public.profiles FOR SELECT
  TO anon
  USING (role IN ('curator', 'admin'));

-- Strip the default table-level grant from anon, then allow only the safe
-- columns. Even with the policy above, anon cannot touch other columns.
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT (id, full_name, role, verification_status, bio, avatar_url, photo_url, instagram, twitter, tiktok, youtube, website)
  ON public.profiles TO anon;
