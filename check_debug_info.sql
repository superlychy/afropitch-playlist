
SELECT
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM
    pg_constraint c
JOIN
    pg_namespace n ON n.oid = c.connamespace
WHERE
    n.nspname = 'public'
    AND c.conrelid = 'public.playlists'::regclass;

SELECT * FROM pg_policies WHERE tablename = 'playlists';
