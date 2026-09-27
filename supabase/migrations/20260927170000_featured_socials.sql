-- Featured artist socials: artists provide at least one social link in the questionnaire.
alter table public.featured_artists
    add column if not exists socials jsonb;

-- submit_featured_questionnaire: accept and store socials.
CREATE OR REPLACE FUNCTION public.submit_featured_questionnaire(
    p_token text,
    p_bio text,
    p_qa jsonb,
    p_photo_url text,
    p_socials jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
    update featured_artists
    set bio = nullif(trim(p_bio), ''),
        qa = coalesce(p_qa, '[]'::jsonb),
        photo_url = nullif(trim(p_photo_url), ''),
        socials = coalesce(p_socials, '{}'::jsonb),
        questionnaire_completed_at = now()
    where questionnaire_token = p_token and status = 'draft';
    return found;
end
$function$;

-- get_featured_questionnaire: include socials so the form can pre-fill.
CREATE OR REPLACE FUNCTION public.get_featured_questionnaire(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare r record;
begin
    select f.id, f.headline, f.bio, f.qa, f.photo_url, f.socials,
           f.questionnaire_completed_at, f.status, f.week_start, f.slug,
           p.full_name as artist_name, s.song_title
    into r
    from featured_artists f
    left join profiles p on p.id = f.artist_id
    left join submissions s on s.id = f.submission_id
    where f.questionnaire_token = p_token;
    if not found then return null; end if;
    return to_jsonb(r);
end
$function$;
