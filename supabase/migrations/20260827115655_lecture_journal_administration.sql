-- ============================================================
-- JOURNAL D'ADMINISTRATION PAGINÉ
-- ============================================================

create index if not exists
    journal_administration_action_date_idx
on public.journal_administration (
    action,
    created_at desc
);


create or replace function public.admin_lister_journal(
    p_recherche text default null,
    p_action text default 'tous',
    p_page integer default 1,
    p_limite integer default 25
)
returns table (
    journal_id uuid,
    action text,

    acteur_id uuid,
    acteur_nom text,

    utilisateur_cible_id uuid,
    utilisateur_cible_nom text,

    sanction_id uuid,
    details jsonb,
    date_action timestamptz,

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

    p_action :=
        coalesce(
            nullif(
                trim(p_action),
                ''
            ),
            'tous'
        );


    -- --------------------------------------------------------
    -- JOURNAL
    -- --------------------------------------------------------

    return query

    with journal_filtre as (

        select
            j.id,
            j.action,

            j.acteur_id,
            pa.nom as acteur_nom,

            j.utilisateur_cible_id,
            pc.nom as utilisateur_cible_nom,

            j.sanction_id,
            j.details,
            j.created_at

        from public.journal_administration j

        left join public.profiles pa
            on pa.id = j.acteur_id

        left join public.profiles pc
            on pc.id = j.utilisateur_cible_id

        where
            (
                p_action = 'tous'
                or j.action = p_action
            )

            and (
                p_recherche is null

                or pa.nom ilike
                    '%' || p_recherche || '%'

                or pc.nom ilike
                    '%' || p_recherche || '%'
            )
    ),

    nombre_total as (

        select
            count(*)::bigint as total
        from journal_filtre

    ),

    journal_page as (

        select
            jf.*

        from journal_filtre jf

        order by
            jf.created_at desc,
            jf.id desc

        limit p_limite

        offset (
            (p_page - 1)
            * p_limite
        )
    )

    select
        jp.id,
        jp.action,

        jp.acteur_id,
        jp.acteur_nom,

        jp.utilisateur_cible_id,
        jp.utilisateur_cible_nom,

        jp.sanction_id,
        jp.details,
        jp.created_at,

        nt.total

    from journal_page jp

    cross join nombre_total nt

    order by
        jp.created_at desc,
        jp.id desc;

end;
$$;


revoke all
on function public.admin_lister_journal(
    text,
    text,
    integer,
    integer
)
from public;

revoke all
on function public.admin_lister_journal(
    text,
    text,
    integer,
    integer
)
from anon;

grant execute
on function public.admin_lister_journal(
    text,
    text,
    integer,
    integer
)
to authenticated;