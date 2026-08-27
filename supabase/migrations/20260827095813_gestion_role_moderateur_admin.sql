-- ============================================================
-- GESTION DU RÔLE MODÉRATEUR
-- ============================================================

create or replace function public.admin_definir_role_moderation(
    p_utilisateur_id uuid,
    p_role text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid;
    v_role_actuel text;
begin

    v_admin_id := auth.uid();


    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    if v_admin_id is null then
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
            r.utilisateur_id = v_admin_id
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    -- --------------------------------------------------------
    -- RÔLE DEMANDÉ
    -- --------------------------------------------------------

    if p_role not in (
        'utilisateur',
        'moderateur'
    ) then
        raise exception 'ROLE_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- UTILISATEUR CIBLE
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_utilisateur_id
    ) then
        raise exception 'UTILISATEUR_INTROUVABLE';
    end if;


    -- On ne modifie jamais son propre rôle depuis cette RPC.
    if p_utilisateur_id = v_admin_id then
        raise exception 'MODIFICATION_ROLE_PROPRE_INTERDITE';
    end if;


    select
        coalesce(
            r.role,
            'utilisateur'
        )

    into
        v_role_actuel

    from public.profiles p

    left join public.roles_utilisateurs r
        on r.utilisateur_id = p.id

    where
        p.id = p_utilisateur_id;


    -- --------------------------------------------------------
    -- PROTECTION DES ADMINISTRATEURS
    -- --------------------------------------------------------

    if v_role_actuel = 'administrateur' then
        raise exception 'ADMINISTRATEUR_PROTEGE';
    end if;


    -- Rien à modifier.
    if v_role_actuel = p_role then
        return p_role;
    end if;


    -- --------------------------------------------------------
    -- APPLICATION DU RÔLE
    -- --------------------------------------------------------

    if p_role = 'utilisateur' then

        -- Un utilisateur normal n'a pas de ligne
        -- dans roles_utilisateurs.
        delete from public.roles_utilisateurs r
        where
            r.utilisateur_id = p_utilisateur_id
            and r.role = 'moderateur';

    else

        insert into public.roles_utilisateurs (
            utilisateur_id,
            role,
            attribue_par,
            updated_at
        )
        values (
            p_utilisateur_id,
            'moderateur',
            v_admin_id,
            now()
        )

        on conflict (utilisateur_id)
        do update set
            role = excluded.role,
            attribue_par = excluded.attribue_par,
            updated_at = now();

    end if;


    -- --------------------------------------------------------
    -- JOURNAL ADMINISTRATIF
    -- --------------------------------------------------------

    insert into public.journal_administration (
        acteur_id,
        action,
        utilisateur_cible_id,
        details
    )
    values (
        v_admin_id,
        'modification_role_utilisateur',
        p_utilisateur_id,

        jsonb_build_object(
            'ancien_role',
            v_role_actuel,
            'nouveau_role',
            p_role
        )
    );


    return p_role;

end;
$$;


revoke all
on function public.admin_definir_role_moderation(
    uuid,
    text
)
from public;

revoke all
on function public.admin_definir_role_moderation(
    uuid,
    text
)
from anon;

grant execute
on function public.admin_definir_role_moderation(
    uuid,
    text
)
to authenticated;