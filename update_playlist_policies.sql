
-- 1. Curators DELETE policy
CREATE POLICY "Curators can delete own playlists" ON public.playlists FOR DELETE USING (auth.uid() = curator_id);

-- 2. Admin Policies (Full Access)
-- Note: We use distinct policy names to avoid conflict
CREATE POLICY "Admins can insert playlists" ON public.playlists FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update any playlists" ON public.playlists FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete any playlists" ON public.playlists FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
