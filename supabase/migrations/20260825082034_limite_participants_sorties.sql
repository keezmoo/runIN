-- ============================================================
-- CREATION DE SORTIE AVEC GENRES AUTORISES
--
-- Cette fonction enveloppe la RPC historique afin de conserver
-- toute sa logique :
-- - authentification
-- - MFA
-- - anti-spam
-- - validations
-- ============================================================


create or replace function public.creer_sortie_securisee(
    p_titre text,
    p_genres_autorises text[],
    p_nombre_max_participants smallint,
    p_date_heure_depart timestamp with time zone,
    p_lieu_depart text,
    p_type_sortie text,
    p_longitude double precision,
    p_latitude double precision,
    p_mode_inscription text,
    p_type_entrainement text,
    p_distance_km numeric,
    p_denivele_positif_m integer,
    p_duree_estimee_minutes integer,
    p_intensite text,
    p_allure_secondes_km integer,
    p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_resultat jsonb;
    v_sortie_id uuid;
    v_genre_organisateur text;
begin

    -- --------------------------------------------------------
    -- NOMBRE MAXIMUM DE PARTICIPANTS
    -- --------------------------------------------------------

    if
        p_nombre_max_participants < 2
        or p_nombre_max_participants > 25
    then
        raise exception
            'NOMBRE_PARTICIPANTS_INVALIDE';
    end if;

    -- --------------------------------------------------------
    -- GENRES AUTORISES
    -- --------------------------------------------------------

    if
        p_genres_autorises is null
        or cardinality(p_genres_autorises) = 0
        or not (
            p_genres_autorises <@
            array[
                'homme',
                'femme',
                'autre'
            ]::text[]
        )
    then
        raise exception
            'GENRES_AUTORISES_INVALIDES';
    end if;


    -- --------------------------------------------------------
    -- GENRE DE L'ORGANISATEUR
    -- --------------------------------------------------------

    select p.sexe
    into v_genre_organisateur
    from public.profiles p
    where p.id = auth.uid();


    if v_genre_organisateur is null then
        raise exception
            'PROFIL_INTROUVABLE';
    end if;


    if not (
        v_genre_organisateur =
        any(p_genres_autorises)
    ) then
        raise exception
            'GENRE_ORGANISATEUR_REQUIS';
    end if;


    -- --------------------------------------------------------
    -- APPEL DE LA RPC HISTORIQUE
    --
    -- On conserve ainsi toute sa logique de sécurité,
    -- MFA, anti-spam et validation.
    -- --------------------------------------------------------

    v_resultat :=
        public.creer_sortie_securisee(
            p_titre,
            p_nombre_max_participants,
            p_date_heure_depart,
            p_lieu_depart,
            p_type_sortie,
            p_longitude,
            p_latitude,
            p_mode_inscription,
            p_type_entrainement,
            p_distance_km,
            p_denivele_positif_m,
            p_duree_estimee_minutes,
            p_intensite,
            p_allure_secondes_km,
            p_description
        );


    -- --------------------------------------------------------
    -- SI LA SORTIE A ETE CREEE
    -- --------------------------------------------------------

    if
        v_resultat ->> 'statut' = 'CREEE'
        and
        v_resultat ->> 'sortie_id' is not null
    then

        v_sortie_id :=
            (
                v_resultat ->>
                'sortie_id'
            )::uuid;


        update public.sorties
        set genres_autorises =
            p_genres_autorises
        where id = v_sortie_id
          and organisateur_id =
              auth.uid();

    end if;


    return v_resultat;

end;
$function$;


-- ============================================================
-- DROITS
-- ============================================================

revoke all
on function public.creer_sortie_securisee(
    text,
    text[],
    smallint,
    timestamp with time zone,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    numeric,
    integer,
    integer,
    text,
    integer,
    text
)
from public, anon;


grant execute
on function public.creer_sortie_securisee(
    text,
    text[],
    smallint,
    timestamp with time zone,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    numeric,
    integer,
    integer,
    text,
    integer,
    text
)
to authenticated;


grant execute
on function public.creer_sortie_securisee(
    text,
    text[],
    smallint,
    timestamp with time zone,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    numeric,
    integer,
    integer,
    text,
    integer,
    text
)
to service_role;


-- L'ancienne RPC ne doit plus être directement utilisable
-- par les utilisateurs de l'application.

revoke execute
on function public.creer_sortie_securisee(
    text,
    smallint,
    timestamp with time zone,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    numeric,
    integer,
    integer,
    text,
    integer,
    text
)
from public, anon, authenticated;


-- Force PostgREST à recharger les signatures RPC.

notify pgrst, 'reload schema';
