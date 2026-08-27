-- ============================================================
-- LISTE PAGINÉE DES SORTIES - ADMINISTRATION
-- ============================================================

create index if not exists
    sorties_statut_date_idx
on public.sorties (
    statut,
    date_heure_depart
);


create or replace function public.admin_lister_sorties(
    p_recherche text default null,
    p_statut text default 'tous',
    p_periode text default 'toutes',
    p_type text default 'tous',
    p_tri text default 'date_desc',
    p_page integer default 1,
    p_limite integer default 25
)
returns table (
    sortie_id uuid,
    titre text,

    organisateur_id uuid,
    organisateur_nom text,

    date_heure_depart timestamptz,
    lieu_depart text,

    type_sortie text,
    statut text,

    nombre_max_participants smallint,
    nombre_participants bigint,
    demandes_en_attente bigint,

    date_creation timestamptz,

    total_resultats bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- MFA OBLIGATOIRE
    -- --------------------------------------------------------

    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    -- --------------------------------------------------------
    -- ADMINISTRATEUR UNIQUEMENT
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = auth.uid()
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    -- --------------------------------------------------------
    -- PARAMÈTRES
    -- --------------------------------------------------------

    p_page :=
        greatest(
            coalesce(p_page, 1),
            1
        );


    p_limite :=
        case
            when p_limite in (25, 50, 100)
                then p_limite
            else 25
        end;


    p_recherche :=
        nullif(
            trim(p_recherche),
            ''
        );


    if p_statut not in (
        'tous',
        'planifiee',
        'annulee'
    ) then
        p_statut := 'tous';
    end if;


    if p_periode not in (
        'toutes',
        'a_venir',
        'passees'
    ) then
        p_periode := 'toutes';
    end if;


    if p_type not in (
        'tous',
        'route',
        'trail'
    ) then
        p_type := 'tous';
    end if;


    if p_tri not in (
        'date_desc',
        'date_asc',
        'creation_desc'
    ) then
        p_tri := 'date_desc';
    end if;


    -- --------------------------------------------------------
    -- RÉSULTATS
    -- --------------------------------------------------------

    return query

    with sorties_filtrees as (

        select
            s.id,
            s.titre,

            s.organisateur_id,
            p.nom as organisateur_nom,

            s.date_heure_depart,
            s.lieu_depart,

            s.type_sortie,
            s.statut,

            s.nombre_max_participants,
            s.created_at

        from public.sorties s

        join public.profiles p
            on p.id = s.organisateur_id

        where

            -- Recherche
            (
                p_recherche is null

                or s.titre ilike
                    '%' || p_recherche || '%'

                or s.lieu_depart ilike
                    '%' || p_recherche || '%'

                or p.nom ilike
                    '%' || p_recherche || '%'
            )


            -- Statut
            and (
                p_statut = 'tous'
                or s.statut = p_statut
            )


            -- Type
            and (
                p_type = 'tous'
                or s.type_sortie = p_type
            )


            -- Période
            and (
                p_periode = 'toutes'

                or (
                    p_periode = 'a_venir'
                    and s.date_heure_depart >= now()
                )

                or (
                    p_periode = 'passees'
                    and s.date_heure_depart < now()
                )
            )
    ),


    nombre_total as (

        select
            count(*)::bigint as total

        from sorties_filtrees
    ),


    sorties_page as (

        select
            sf.*

        from sorties_filtrees sf

        order by

            case
                when p_tri = 'date_desc'
                then sf.date_heure_depart
            end desc,

            case
                when p_tri = 'date_asc'
                then sf.date_heure_depart
            end asc,

            case
                when p_tri = 'creation_desc'
                then sf.created_at
            end desc,

            sf.id desc

        limit p_limite

        offset (
            (p_page - 1)
            * p_limite
        )
    ),


    participations_page as (

        select
            pa.sortie_id,
            count(*)::bigint as nombre

        from public.participations pa

        join sorties_page sp
            on sp.id = pa.sortie_id

        group by
            pa.sortie_id
    ),


    demandes_page as (

        select
            d.sortie_id,
            count(*)::bigint as nombre

        from public.demandes_participation d

        join sorties_page sp
            on sp.id = d.sortie_id

        where
            d.statut = 'en_attente'

        group by
            d.sortie_id
    )


    select
        sp.id,
        sp.titre,

        sp.organisateur_id,
        sp.organisateur_nom,

        sp.date_heure_depart,
        sp.lieu_depart,

        sp.type_sortie,
        sp.statut,

        sp.nombre_max_participants,

        (
            coalesce(
                pp.nombre,
                0
            )
            + 1
        )::bigint,

        coalesce(
            dp.nombre,
            0
        )::bigint,

        sp.created_at,

        nt.total

    from sorties_page sp

    cross join nombre_total nt

    left join participations_page pp
        on pp.sortie_id = sp.id

    left join demandes_page dp
        on dp.sortie_id = sp.id

    order by

        case
            when p_tri = 'date_desc'
            then sp.date_heure_depart
        end desc,

        case
            when p_tri = 'date_asc'
            then sp.date_heure_depart
        end asc,

        case
            when p_tri = 'creation_desc'
            then sp.created_at
        end desc,

        sp.id desc;

end;
$$;


revoke all
on function public.admin_lister_sorties(
    text,
    text,
    text,
    text,
    text,
    integer,
    integer
)
from public;

revoke all
on function public.admin_lister_sorties(
    text,
    text,
    text,
    text,
    text,
    integer,
    integer
)
from anon;

grant execute
on function public.admin_lister_sorties(
    text,
    text,
    text,
    text,
    text,
    integer,
    integer
)
to authenticated;