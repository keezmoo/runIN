-- ============================================================
-- ETAT ACTUEL DES COMPTES DANS LA LISTE ADMIN
-- ============================================================

create or replace function public.admin_statuts_utilisateurs(
    p_utilisateur_ids uuid[]
)
returns table (
    utilisateur_id uuid,
    statut_compte text,
    sanction_type text,
    sanction_date_fin timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    -- --------------------------------------------------------
    -- SECURITE
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception
            'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then

        raise exception
            'MFA_REQUIS';
    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then

        raise exception
            'ACCES_ADMIN_REFUSE';
    end if;


    -- --------------------------------------------------------
    -- RESULTAT
    -- --------------------------------------------------------

    return query

    select
        p.id,

        case

            when sanction.type = 'bannissement'
            then 'banni'

            when sanction.type = 'suspension'
            then 'suspendu'

            else 'actif'

        end
            as statut_compte,

        sanction.type
            as sanction_type,

        sanction.date_fin
            as sanction_date_fin

    from public.profiles p


    left join lateral (

        select
            s.type,
            s.date_fin

        from public.sanctions_utilisateurs s

        where
            s.utilisateur_id =
                p.id

            and s.levee_at is null

            and s.date_debut <=
                now()

            and (
                s.date_fin is null
                or
                s.date_fin > now()
            )

        order by
            s.date_debut desc,
            s.created_at desc

        limit 1

    ) sanction
        on true


    where
        p.id =
        any(
            coalesce(
                p_utilisateur_ids,
                array[]::uuid[]
            )
        );

end;
$$;


revoke all
on function public.admin_statuts_utilisateurs(uuid[])
from public;


revoke all
on function public.admin_statuts_utilisateurs(uuid[])
from anon;


grant execute
on function public.admin_statuts_utilisateurs(uuid[])
to authenticated;
