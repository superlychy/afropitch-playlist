-- Ensure submissions table references playlists for joins to work
do $$
begin
    -- Check if constraint exists, if not try to add it
    -- Note: This might fail if there is dirty data (submissions with invalid playlist_ids)
    if not exists (
        select 1 
        from information_schema.key_column_usage 
        where table_name = 'submissions' 
        and column_name = 'playlist_id' 
        and position_in_unique_constraint is not null
    ) then
        -- This is a best-effort validation. 
        -- Real constraint check:
        alter table public.submissions 
        add constraint submissions_playlist_id_fkey 
        foreign key (playlist_id) 
        references public.playlists(id) 
        on delete set null;
    end if;
exception when others then
    raise notice 'Could not add foreign key constraint: %', SQLERRM;
end;
$$;
