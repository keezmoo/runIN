-- ============================================================
-- GENRES AUTORISÉS SUR LES SORTIES
-- ============================================================

alter table public.sorties
add column genres_autorises text[]
not null
default array[
    'homme',
    'femme',
    'autre'
]::text[];


alter table public.sorties
add constraint sorties_genres_autorises_check
check (
    cardinality(genres_autorises) >= 1
    and
    genres_autorises <@
        array[
            'homme',
            'femme',
            'autre'
        ]::text[]
);

create or replace function
runin_private.verifier_genres_sortie()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_sexe_organisateur text;
begin

    select p.sexe
    into v_sexe_organisateur
    from public.profiles p
    where p.id = new.organisateur_id;


    if v_sexe_organisateur is null then
        raise exception
            'PROFIL_ORGANISATEUR_INTROUVABLE';
    end if;


    if not (
        v_sexe_organisateur =
        any(new.genres_autorises)
    ) then
        raise exception
            'GENRE_ORGANISATEUR_REQUIS';
    end if;


    -- Une modification ne doit pas rendre
    -- un participant déjà inscrit incompatible.

    if exists (
        select 1

        from public.participations pa

        join public.profiles p
            on p.id = pa.utilisateur_id

        where pa.sortie_id = new.id

          and not (
              p.sexe =
              any(new.genres_autorises)
          )
    ) then

        raise exception
            'GENRE_PARTICIPANT_DEJA_PRESENT';

    end if;


    return new;

end;
$function$;


drop trigger if exists
trigger_verifier_genres_sortie
on public.sorties;


create trigger
trigger_verifier_genres_sortie
before insert or update of
    genres_autorises,
    organisateur_id
on public.sorties
for each row
execute function
    runin_private.verifier_genres_sortie();

    create or replace function
runin_private.verifier_genre_participant()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_sexe text;
    v_genres_autorises text[];
begin

    select p.sexe
    into v_sexe
    from public.profiles p
    where p.id = new.utilisateur_id;


    if v_sexe is null then
        raise exception
            'PROFIL_INTROUVABLE';
    end if;


    select s.genres_autorises
    into v_genres_autorises
    from public.sorties s
    where s.id = new.sortie_id;


    if v_genres_autorises is null then
        raise exception
            'SORTIE_INTROUVABLE';
    end if;


    if not (
        v_sexe =
        any(v_genres_autorises)
    ) then
        raise exception
            'GENRE_NON_AUTORISE';
    end if;


    return new;

end;
$function$;


drop trigger if exists
trigger_verifier_genre_participation
on public.participations;


create trigger
trigger_verifier_genre_participation
before insert or update of
    sortie_id,
    utilisateur_id
on public.participations
for each row
execute function
    runin_private.verifier_genre_participant();


drop trigger if exists
trigger_verifier_genre_demande
on public.demandes_participation;


create trigger
trigger_verifier_genre_demande
before insert or update of
    sortie_id,
    utilisateur_id
on public.demandes_participation
for each row
execute function
    runin_private.verifier_genre_participant();