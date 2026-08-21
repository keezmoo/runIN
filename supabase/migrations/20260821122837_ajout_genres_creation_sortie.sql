create or replace function public.creer_sortie_securisee(
    p_titre text,
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
    p_description text,
    p_genres_autorises text[]
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_resultat jsonb;
    v_sortie_id uuid;
begin

    -- --------------------------------------------------------
    -- GENRES AUTORISÉS
    -- --------------------------------------------------------

    if
        p_genres_autorises is null
        or cardinality(p_genres_autorises) = 0
        or cardinality(p_genres_autorises) > 3
        or array_position(
            p_genres_autorises,
            null
        ) is not null
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
    -- CRÉATION EXISTANTE
    --
    -- On réutilise toute la fonction sécurisée actuelle :
    -- validations, MFA, anti-spam, etc.
    -- --------------------------------------------------------

    select public.creer_sortie_securisee(
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
    )
    into v_resultat;


    -- --------------------------------------------------------
    -- SI LA SORTIE A BIEN ÉTÉ CRÉÉE
    -- --------------------------------------------------------

    if
        v_resultat ->> 'statut' =
        'CREEE'
    then

        v_sortie_id :=
            (
                v_resultat
                ->> 'sortie_id'
            )::uuid;


        update public.sorties
        set genres_autorises =
            p_genres_autorises
        where id = v_sortie_id;

        -- Le trigger créé précédemment vérifiera ici
        -- que le genre de l'organisateur est autorisé.

    end if;


    return v_resultat;

end;
$function$;


revoke all on function public.creer_sortie_securisee(
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
    text,
    text[]
) from public;


grant execute on function public.creer_sortie_securisee(
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
    text,
    text[]
) to authenticated;


grant execute on function public.creer_sortie_securisee(
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
    text,
    text[]
) to service_role;