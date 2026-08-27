-- ============================================================
-- LISTE ADMIN DES UTILISATEURS
-- FILTRE PAR ETAT ACTUEL DU COMPTE
-- ============================================================


-- L'ancienne fonction possède 5 paramètres.
-- On la remplace par une version à 6 paramètres.

drop function if exists
public.admin_lister_utilisateurs_page(
    text,
    text,
    text,
    text,
    integer,
    integer
);

drop function if exists
public.admin_lister_utilisateurs_page(
    text,
    text,
    text,
    integer,
    integer
);


create function public.admin_lister_utilisateurs_page(
    p_recherche text default null,
    p_tri text default 'date_desc',
    p_role text default 'tous',
    p_statut_compte text default 'tous',
    p_page integer default 1,
    p_limite integer default 25
)
returns table (
    utilisateur_id uuid,
    nom text,
    email text,
    age smallint,
    sexe text,
    role text,

    statut_compte text,
    sanction_type text,
    sanction_date_fin timestamptz,

    date_inscription timestamptz,
    derniere_connexion timestamptz,
    nombre_sorties bigint,
    nombre_participations bigint,
    total_resultats bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    -- ========================================================
    -- SECURITE
    -- ========================================================

    if auth.uid() is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    -- ========================================================
    -- PARAMETRES
    -- ========================================================

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


    if p_role not in (
        'tous',
        'utilisateur',
        'moderateur',
        'administrateur'
    ) then
        p_role := 'tous';
    end if;


    if p_statut_compte not in (
        'tous',
        'actif',
        'suspendu',
        'banni'
    ) then
        p_statut_compte := 'tous';
    end if;


    -- ========================================================
    -- RESULTATS
    -- ========================================================

    return query

    with utilisateurs_avec_statut as (

        select
            p.id,
            p.nom,
            u.email::text as email,
            p.age,
            p.sexe,

            coalesce(
                r.role,
                'utilisateur'
            )::text as role,


            case

                when sanction.type = 'bannissement'
                    then 'banni'

                when sanction.type = 'suspension'
                    then 'suspendu'

                else 'actif'

            end::text
                as statut_compte,


            sanction.type::text
                as sanction_type,

            sanction.date_fin
                as sanction_date_fin,


            u.created_at,
            u.last_sign_in_at


        from public.profiles p


        join auth.users u
            on u.id = p.id


        left join public.roles_utilisateurs r
            on r.utilisateur_id = p.id


        -- ----------------------------------------------------
        -- SANCTION ACTUELLEMENT ACTIVE
        -- ----------------------------------------------------

        left join lateral (

            select
                s.type,
                s.date_fin,
                s.date_debut,
                s.created_at

            from public.sanctions_utilisateurs s

            where
                s.utilisateur_id = p.id

                and s.levee_at is null

                and s.date_debut <= now()

                and (
                    s.date_fin is null
                    or s.date_fin > now()
                )

            order by

                -- En cas d'anomalie avec plusieurs sanctions
                -- simultanées, un bannissement est prioritaire.

                case
                    when s.type = 'bannissement'
                        then 0
                    else 1
                end,

                s.date_debut desc,
                s.created_at desc

            limit 1

        ) sanction
            on true


        where

            (
                p_recherche is null

                or p.nom ilike
                    '%' || p_recherche || '%'

                or u.email ilike
                    '%' || p_recherche || '%'
            )


            and (

                p_role = 'tous'

                or coalesce(
                    r.role,
                    'utilisateur'
                ) = p_role

            )

    ),


    utilisateurs_filtres as (

        select
            uas.*

        from utilisateurs_avec_statut uas

        where

            p_statut_compte = 'tous'

            or uas.statut_compte =
                p_statut_compte

    ),


    nombre_total as (

        select
            count(*)::bigint as total

        from utilisateurs_filtres

    ),


    utilisateurs_page as (

        select
            uf.*

        from utilisateurs_filtres uf

        order by

            case
                when p_tri = 'date_desc'
                    then uf.created_at
            end desc,


            case
                when p_tri = 'date_asc'
                    then uf.created_at
            end asc,


            case
                when p_tri = 'nom_asc'
                    then lower(uf.nom)
            end asc,


            case
                when p_tri = 'nom_desc'
                    then lower(uf.nom)
            end desc,


            case
                when p_tri = 'connexion_desc'
                    then uf.last_sign_in_at
            end desc nulls last,


            uf.created_at desc


        limit p_limite

        offset (
            (p_page - 1)
            * p_limite
        )

    ),


    sorties_page as (

        select
            s.organisateur_id,
            count(*)::bigint as nombre

        from public.sorties s

        join utilisateurs_page up
            on up.id = s.organisateur_id

        group by
            s.organisateur_id

    ),


    participations_page as (

        select
            p.utilisateur_id,
            count(*)::bigint as nombre

        from public.participations p

        join utilisateurs_page up
            on up.id = p.utilisateur_id

        group by
            p.utilisateur_id

    )


    select
        up.id,
        up.nom,
        up.email,
        up.age,
        up.sexe,
        up.role,

        up.statut_compte,
        up.sanction_type,
        up.sanction_date_fin,

        up.created_at,
        up.last_sign_in_at,


        coalesce(
            sp.nombre,
            0
        )::bigint,


        coalesce(
            pp.nombre,
            0
        )::bigint,


        nt.total


    from utilisateurs_page up

    cross join nombre_total nt


    left join sorties_page sp
        on sp.organisateur_id =
            up.id


    left join participations_page pp
        on pp.utilisateur_id =
            up.id


    order by

        case
            when p_tri = 'date_desc'
                then up.created_at
        end desc,


        case
            when p_tri = 'date_asc'
                then up.created_at
        end asc,


        case
            when p_tri = 'nom_asc'
                then lower(up.nom)
        end asc,


        case
            when p_tri = 'nom_desc'
                then lower(up.nom)
        end desc,


        case
            when p_tri = 'connexion_desc'
                then up.last_sign_in_at
        end desc nulls last,


        up.created_at desc;

end;
$$;


revoke all
on function public.admin_lister_utilisateurs_page(
    text,
    text,
    text,
    text,
    integer,
    integer
)
from public;


revoke all
on function public.admin_lister_utilisateurs_page(
    text,
    text,
    text,
    text,
    integer,
    integer
)
from anon;


grant execute
on function public.admin_lister_utilisateurs_page(
    text,
    text,
    text,
    text,
    integer,
    integer
)
to authenticated;
