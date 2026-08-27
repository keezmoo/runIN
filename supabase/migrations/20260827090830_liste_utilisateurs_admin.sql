-- ============================================================
-- LISTE DES UTILISATEURS POUR L'ADMINISTRATION
-- ============================================================

create or replace function public.admin_lister_utilisateurs(
    p_recherche text default null,
    p_tri text default 'date_desc',
    p_limite integer default 50
)
returns table (
    utilisateur_id uuid,
    nom text,
    email text,
    age smallint,
    sexe text,
    role text,
    date_inscription timestamptz,
    derniere_connexion timestamptz,
    nombre_sorties bigint,
    nombre_participations bigint
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

    p_limite :=
        greatest(
            1,
            least(
                coalesce(p_limite, 50),
                100
            )
        );

    p_recherche :=
        nullif(
            trim(p_recherche),
            ''
        );


    -- --------------------------------------------------------
    -- LISTE
    -- --------------------------------------------------------

    return query

    with sorties_par_utilisateur as (
        select
            s.organisateur_id,
            count(*)::bigint as nombre
        from public.sorties s
        group by s.organisateur_id
    ),

    participations_par_utilisateur as (
        select
            p.utilisateur_id,
            count(*)::bigint as nombre
        from public.participations p
        group by p.utilisateur_id
    )

    select
        p.id,
        p.nom,
        u.email::text,
        p.age,
        p.sexe,

        coalesce(
            r.role,
            'utilisateur'
        )::text,

        u.created_at,
        u.last_sign_in_at,

        coalesce(
            sp.nombre,
            0
        )::bigint,

        coalesce(
            pp.nombre,
            0
        )::bigint

    from public.profiles p

    join auth.users u
        on u.id = p.id

    left join public.roles_utilisateurs r
        on r.utilisateur_id = p.id

    left join sorties_par_utilisateur sp
        on sp.organisateur_id = p.id

    left join participations_par_utilisateur pp
        on pp.utilisateur_id = p.id

    where
        p_recherche is null
        or p.nom ilike
            '%' || p_recherche || '%'
        or u.email ilike
            '%' || p_recherche || '%'

    order by

        case
            when p_tri = 'date_desc'
            then u.created_at
        end desc,

        case
            when p_tri = 'date_asc'
            then u.created_at
        end asc,

        case
            when p_tri = 'nom_asc'
            then lower(p.nom)
        end asc,

        case
            when p_tri = 'nom_desc'
            then lower(p.nom)
        end desc,

        case
            when p_tri = 'connexion_desc'
            then u.last_sign_in_at
        end desc nulls last,

        u.created_at desc

    limit p_limite;

end;
$$;


revoke all
on function public.admin_lister_utilisateurs(
    text,
    text,
    integer
)
from public;

revoke all
on function public.admin_lister_utilisateurs(
    text,
    text,
    integer
)
from anon;

grant execute
on function public.admin_lister_utilisateurs(
    text,
    text,
    integer
)
to authenticated;