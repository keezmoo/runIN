begin;

-- ============================================================
-- NOUVELLES REGLES METIER DES SORTIES
-- ============================================================

-- Ces deux informations deviennent obligatoires
-- pour toutes les nouvelles sorties.

alter table public.sorties
    alter column type_entrainement set not null,
    alter column intensite set not null;


-- En trail, le D+ est obligatoire.
-- En route, il reste facultatif.
-- La contrainte existante sorties_denivele_check
-- continue de garantir qu'une valeur renseignée est >= 0.

alter table public.sorties
    drop constraint if exists
        sorties_trail_denivele_obligatoire_check;

alter table public.sorties
    add constraint
        sorties_trail_denivele_obligatoire_check
    check (
        type_sortie <> 'trail'
        or denivele_positif_m is not null
    );


-- ============================================================
-- CREATION SECURISEE D'UNE SORTIE
-- ============================================================

create or replace function public.creer_sortie_securisee(
    p_titre text,
    p_nombre_max_participants smallint,
    p_date_heure_depart timestamptz,
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
set search_path to ''
as $function$
declare

    v_user_id uuid;
    v_sortie_id uuid;

    v_nombre_recent integer;
    v_bloque_jusqua timestamptz;
    v_secondes_restantes integer;

begin

    v_user_id := auth.uid();


    -- ========================================================
    -- AUTHENTIFICATION
    -- ========================================================

    if v_user_id is null then
        raise exception
            'UTILISATEUR_NON_AUTHENTIFIE';
    end if;


    if not public.session_mfa_autorisee() then
        raise exception
            'SESSION_MFA_REQUISE';
    end if;


    if not exists (
        select 1
        from public.profiles p
        where p.id = v_user_id
    ) then
        raise exception
            'PROFIL_INTROUVABLE';
    end if;


    -- ========================================================
    -- ANTI-SPAM / CONCURRENCE
    -- ========================================================

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                v_user_id::text,
                0
            )
        );


    select
        b.bloque_jusqua
    into
        v_bloque_jusqua
    from runin_private.blocages_creation_sorties b
    where b.utilisateur_id = v_user_id;


    if
        v_bloque_jusqua is not null
        and v_bloque_jusqua > now()
    then

        v_secondes_restantes :=
            ceil(
                extract(
                    epoch from (
                        v_bloque_jusqua - now()
                    )
                )
            )::integer;

        return jsonb_build_object(
            'statut',
            'BLOQUEE',
            'secondes_restantes',
            v_secondes_restantes
        );

    end if;


    delete from
        runin_private.actions_creation_sorties
    where
        utilisateur_id = v_user_id
        and created_at <
            now() - interval '24 hours';


    select
        count(*)
    into
        v_nombre_recent
    from
        runin_private.actions_creation_sorties a
    where
        a.utilisateur_id = v_user_id
        and a.created_at >=
            now() - interval '10 minutes';


    if v_nombre_recent >= 5 then

        v_bloque_jusqua :=
            now() + interval '1 hour';

        insert into
            runin_private.blocages_creation_sorties (
                utilisateur_id,
                bloque_jusqua,
                updated_at
            )
        values (
            v_user_id,
            v_bloque_jusqua,
            now()
        )
        on conflict (
            utilisateur_id
        )
        do update
        set
            bloque_jusqua =
                excluded.bloque_jusqua,
            updated_at =
                now();

        return jsonb_build_object(
            'statut',
            'BLOQUEE',
            'secondes_restantes',
            3600
        );

    end if;


    -- ========================================================
    -- TITRE
    -- ========================================================

    if
        char_length(
            btrim(
                coalesce(
                    p_titre,
                    ''
                )
            )
        ) < 3

        or

        char_length(
            btrim(
                coalesce(
                    p_titre,
                    ''
                )
            )
        ) > 100
    then
        raise exception
            'TITRE_INVALIDE';
    end if;


    -- ========================================================
    -- PARTICIPANTS
    -- ========================================================

    if
        p_nombre_max_participants < 2
        or p_nombre_max_participants > 100
    then
        raise exception
            'NOMBRE_PARTICIPANTS_INVALIDE';
    end if;


    -- ========================================================
    -- DATE
    -- ========================================================

    if
        p_date_heure_depart is null
        or p_date_heure_depart <= now()
    then
        raise exception
            'DATE_DEPART_INVALIDE';
    end if;


    -- ========================================================
    -- LIEU
    -- ========================================================

    if
        char_length(
            btrim(
                coalesce(
                    p_lieu_depart,
                    ''
                )
            )
        ) < 2
    then
        raise exception
            'LIEU_DEPART_INVALIDE';
    end if;


    -- ========================================================
    -- TYPE DE SORTIE
    -- ========================================================

    if
        p_type_sortie is null
        or p_type_sortie not in (
            'route',
            'trail'
        )
    then
        raise exception
            'TYPE_SORTIE_INVALIDE';
    end if;


    -- ========================================================
    -- COORDONNEES
    -- ========================================================

    if
        p_longitude is null
        or p_longitude < -180
        or p_longitude > 180
    then
        raise exception
            'LONGITUDE_INVALIDE';
    end if;


    if
        p_latitude is null
        or p_latitude < -90
        or p_latitude > 90
    then
        raise exception
            'LATITUDE_INVALIDE';
    end if;


    -- ========================================================
    -- MODE D'INSCRIPTION
    -- ========================================================

    if
        p_mode_inscription is null
        or p_mode_inscription not in (
            'automatique',
            'validation'
        )
    then
        raise exception
            'MODE_INSCRIPTION_INVALIDE';
    end if;


    -- ========================================================
    -- TYPE D'ENTRAINEMENT
    -- Obligatoire
    -- ========================================================

    if
        p_type_entrainement is null
        or p_type_entrainement not in (
            'endurance_fondamentale',
            'sortie_longue',
            'tempo_seuil',
            'fractionne',
            'cotes',
            'recuperation',
            'libre'
        )
    then
        raise exception
            'TYPE_ENTRAINEMENT_INVALIDE';
    end if;


    -- ========================================================
    -- DISTANCE
    -- Obligatoire Route + Trail
    -- ========================================================

    if
        p_distance_km is null
        or p_distance_km <= 0
    then
        raise exception
            'DISTANCE_INVALIDE';
    end if;


    -- ========================================================
    -- DENIVELE
    --
    -- Trail : obligatoire
    -- Route : facultatif
    -- ========================================================

    if
        p_type_sortie = 'trail'
        and p_denivele_positif_m is null
    then
        raise exception
            'DENIVELE_REQUIS_TRAIL';
    end if;


    if
        p_denivele_positif_m is not null
        and p_denivele_positif_m < 0
    then
        raise exception
            'DENIVELE_INVALIDE';
    end if;


    -- ========================================================
    -- DUREE TOTALE ESTIMEE
    -- Facultative Route + Trail
    -- ========================================================

    if
        p_duree_estimee_minutes is not null
        and p_duree_estimee_minutes <= 0
    then
        raise exception
            'DUREE_INVALIDE';
    end if;


    -- ========================================================
    -- INTENSITE
    -- Obligatoire
    -- ========================================================

    if
        p_intensite is null
        or p_intensite not in (
            'tranquille',
            'moderee',
            'soutenue'
        )
    then
        raise exception
            'INTENSITE_INVALIDE';
    end if;


 -- ========================================================
-- ALLURE
--
-- Route : obligatoire
-- Trail : facultative
-- ========================================================

if
    p_type_sortie = 'route'
    and p_allure_secondes_km is null
then
    raise exception
        'ALLURE_REQUISE_ROUTE';
end if;


if
    p_allure_secondes_km is not null
    and p_allure_secondes_km <= 0
then
    raise exception
        'ALLURE_INVALIDE';
end if;


    -- ========================================================
    -- DESCRIPTION
    -- ========================================================

    if
        p_description is not null
        and char_length(p_description) > 1000
    then
        raise exception
            'DESCRIPTION_TROP_LONGUE';
    end if;


    -- ========================================================
    -- CREATION
    -- ========================================================

    insert into public.sorties (

        titre,
        organisateur_id,
        nombre_max_participants,
        date_heure_depart,
        lieu_depart,
        type_sortie,
        position_depart,
        mode_inscription,
        type_entrainement,
        distance_km,
        denivele_positif_m,
        duree_estimee_minutes,
        intensite,
        allure_secondes_km,
        description

    )
    values (

        btrim(p_titre),
        v_user_id,
        p_nombre_max_participants,
        p_date_heure_depart,
        btrim(p_lieu_depart),
        p_type_sortie,

        extensions.st_setsrid(
            extensions.st_makepoint(
                p_longitude,
                p_latitude
            ),
            4326
        )::extensions.geography,

        p_mode_inscription,
        p_type_entrainement,
        p_distance_km,
        p_denivele_positif_m,
        p_duree_estimee_minutes,
        p_intensite,

-- Route : obligatoire
-- Trail : facultative
p_allure_secondes_km,

        nullif(
            btrim(
                coalesce(
                    p_description,
                    ''
                )
            ),
            ''
        )

    )
    returning id
    into v_sortie_id;



    -- ========================================================
    -- HISTORIQUE ANTI-SPAM
    -- ========================================================

    insert into
        runin_private.actions_creation_sorties (
            utilisateur_id
        )
    values (
        v_user_id
    );


    return jsonb_build_object(
        'statut',
        'CREEE',
        'sortie_id',
        v_sortie_id
    );

end;
$function$;

-- ============================================================
-- ALLURE OBLIGATOIRE POUR LES SORTIES ROUTE
-- ============================================================

alter table public.sorties
    drop constraint if exists
        sorties_route_allure_obligatoire_check;

alter table public.sorties
    add constraint
        sorties_route_allure_obligatoire_check
    check (
        type_sortie <> 'route'
        or allure_secondes_km is not null
    );

-- ============================================================
-- PERMISSIONS RPC
-- ============================================================

revoke all
on function public.creer_sortie_securisee(
    text,
    smallint,
    timestamptz,
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
from PUBLIC, anon, authenticated;

grant execute
on function public.creer_sortie_securisee(
    text,
    smallint,
    timestamptz,
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
to authenticated, service_role;


commit;