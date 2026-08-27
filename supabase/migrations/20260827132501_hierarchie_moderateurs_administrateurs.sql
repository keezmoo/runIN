-- ============================================================
-- MODÉRATEURS = ACCÈS AUX OUTILS D'ADMINISTRATION COURANTS
--
-- On conserve la gestion des rôles exclusivement aux admins.
-- ============================================================

do $$
declare
    v_nom text;
    v_oid oid;
    v_definition text;
    v_nouvelle_definition text;
begin

    foreach v_nom in array array[
        'admin_lister_utilisateurs_page',
        'admin_detail_utilisateur',
        'admin_historique_sanctions',
        'admin_lister_journal',
        'admin_lister_sorties',
        'admin_detail_sortie',
        'admin_annuler_sortie',
        'admin_supprimer_sortie'
    ]
    loop

        v_oid := null;

        select p.oid
        into v_oid
        from pg_proc p
        join pg_namespace n
            on n.oid = p.pronamespace
        where
            n.nspname = 'public'
            and p.proname = v_nom
        order by p.oid desc
        limit 1;


        if v_oid is null then
            raise exception
                'FONCTION_ADMIN_INTROUVABLE: %',
                v_nom;
        end if;


        v_definition :=
            pg_get_functiondef(v_oid);


        -- ----------------------------------------------------
        -- Cas habituel :
        --
        -- r.role = 'administrateur'
        --
        -- On ne remplace que la PREMIÈRE occurrence,
        -- qui correspond au contrôle de l'acteur.
        -- ----------------------------------------------------

        v_nouvelle_definition :=
            regexp_replace(
                v_definition,

                '([A-Za-z_][A-Za-z0-9_]*\.)role[[:space:]]*=[[:space:]]*''administrateur''',

                E'\\1role in (''moderateur'', ''administrateur'')'
            );


        -- ----------------------------------------------------
        -- Si une fonction utilisait notre helper
        -- est_administrateur(), on utilise le helper déjà
        -- prévu pour les deux rôles.
        -- ----------------------------------------------------

        if v_nouvelle_definition = v_definition then

            v_nouvelle_definition :=
                replace(
                    v_definition,

                    'runin_private.est_administrateur()',

                    'runin_private.est_moderateur_ou_administrateur()'
                );

        end if;


        if v_nouvelle_definition = v_definition then

            raise exception
                'AUTORISATION_ADMIN_NON_TROUVEE_DANS: %',
                v_nom;

        end if;


        execute v_nouvelle_definition;

    end loop;

end;
$$;

-- ============================================================
-- SANCTIONNER UN UTILISATEUR
-- ============================================================

create or replace function public.admin_sanctionner_utilisateur(
    p_utilisateur_id uuid,
    p_type text,
    p_motif text,
    p_duree_jours integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_acteur_id uuid;
    v_role_acteur text;

    v_role_cible text;

    v_motif text;
    v_date_fin timestamptz;

    v_sanction_id uuid;
begin

    v_acteur_id :=
        auth.uid();


    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    if v_acteur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- MFA
    -- --------------------------------------------------------

    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    -- --------------------------------------------------------
    -- RÔLE DE L'ACTEUR
    -- --------------------------------------------------------

    select
        r.role

    into
        v_role_acteur

    from public.roles_utilisateurs r

    where
        r.utilisateur_id =
            v_acteur_id;


    if coalesce(
        v_role_acteur,
        'utilisateur'
    ) not in (
        'moderateur',
        'administrateur'
    ) then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    -- --------------------------------------------------------
    -- CIBLE
    -- --------------------------------------------------------

    select
        coalesce(
            r.role,
            'utilisateur'
        )

    into
        v_role_cible

    from public.profiles p

    left join public.roles_utilisateurs r
        on r.utilisateur_id = p.id

    where
        p.id =
            p_utilisateur_id;


    if not found then
        raise exception
            'UTILISATEUR_INTROUVABLE';
    end if;


    -- Impossible de se sanctionner soi-même.
    if p_utilisateur_id =
       v_acteur_id then

        raise exception
            'AUTO_SANCTION_INTERDITE';

    end if;


    -- --------------------------------------------------------
    -- HIÉRARCHIE
    --
    -- Modérateur :
    -- utilisateur uniquement.
    --
    -- Administrateur :
    -- utilisateur + modérateur.
    --
    -- Les administrateurs sont protégés.
    -- --------------------------------------------------------

    if
        v_role_acteur = 'moderateur'
        and
        v_role_cible in (
            'moderateur',
            'administrateur'
        )
    then

        raise exception
            'CIBLE_HIERARCHIQUE_PROTEGEE';

    end if;


    if
        v_role_acteur = 'administrateur'
        and
        v_role_cible = 'administrateur'
    then

        raise exception
            'CIBLE_HIERARCHIQUE_PROTEGEE';

    end if;


    -- --------------------------------------------------------
    -- TYPE
    -- --------------------------------------------------------

    if p_type not in (
        'suspension',
        'bannissement'
    ) then

        raise exception
            'TYPE_SANCTION_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- MOTIF
    -- --------------------------------------------------------

    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if
        char_length(v_motif) < 3
        or
        char_length(v_motif) > 1000
    then

        raise exception
            'MOTIF_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- DURÉE
    -- --------------------------------------------------------

    if p_type = 'suspension' then

        if
            p_duree_jours is null
            or
            p_duree_jours < 1
            or
            p_duree_jours > 365
        then

            raise exception
                'DUREE_SUSPENSION_INVALIDE';

        end if;


        v_date_fin :=
            now()
            +
            make_interval(
                days => p_duree_jours
            );

    else

        v_date_fin := null;

    end if;


    -- --------------------------------------------------------
    -- SANCTION DÉJÀ ACTIVE ?
    -- --------------------------------------------------------

    if exists (
        select 1

        from public.sanctions_utilisateurs s

        where
            s.utilisateur_id =
                p_utilisateur_id

            and s.levee_at is null

            and s.date_debut <= now()

            and (
                s.date_fin is null
                or s.date_fin > now()
            )
    ) then

        raise exception
            'SANCTION_DEJA_ACTIVE';

    end if;


    -- --------------------------------------------------------
    -- CRÉATION
    -- --------------------------------------------------------

    insert into public.sanctions_utilisateurs (
        utilisateur_id,
        type,
        motif,
        date_fin,
        cree_par
    )
    values (
        p_utilisateur_id,
        p_type,
        v_motif,
        v_date_fin,
        v_acteur_id
    )
    returning id
    into v_sanction_id;


    -- --------------------------------------------------------
    -- JOURNAL
    -- --------------------------------------------------------

    insert into public.journal_administration (
        acteur_id,
        action,
        utilisateur_cible_id,
        sanction_id,
        details
    )
    values (
        v_acteur_id,

        case
            when p_type = 'suspension'
                then 'suspension_utilisateur'
            else
                'bannissement_utilisateur'
        end,

        p_utilisateur_id,
        v_sanction_id,

        jsonb_build_object(
            'motif',
            v_motif,

            'duree_jours',
            p_duree_jours,

            'date_fin',
            v_date_fin
        )
    );


    return v_sanction_id;

end;
$$;


revoke all
on function public.admin_sanctionner_utilisateur(
    uuid,
    text,
    text,
    integer
)
from public;

revoke all
on function public.admin_sanctionner_utilisateur(
    uuid,
    text,
    text,
    integer
)
from anon;

grant execute
on function public.admin_sanctionner_utilisateur(
    uuid,
    text,
    text,
    integer
)
to authenticated;

-- ============================================================
-- LEVER UNE SANCTION
-- ============================================================

create or replace function public.admin_lever_sanction(
    p_sanction_id uuid,
    p_motif text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_acteur_id uuid;
    v_role_acteur text;

    v_utilisateur_id uuid;
    v_role_cible text;

    v_type_sanction text;
    v_motif text;
begin

    v_acteur_id :=
        auth.uid();


    if v_acteur_id is null then
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


    select
        r.role

    into
        v_role_acteur

    from public.roles_utilisateurs r

    where
        r.utilisateur_id =
            v_acteur_id;


    if coalesce(
        v_role_acteur,
        'utilisateur'
    ) not in (
        'moderateur',
        'administrateur'
    ) then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if
        char_length(v_motif) < 3
        or
        char_length(v_motif) > 1000
    then

        raise exception
            'MOTIF_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- SANCTION
    -- --------------------------------------------------------

    select
        s.utilisateur_id,
        s.type

    into
        v_utilisateur_id,
        v_type_sanction

    from public.sanctions_utilisateurs s

    where
        s.id = p_sanction_id

        and s.levee_at is null

        and s.date_debut <= now()

        and (
            s.date_fin is null
            or s.date_fin > now()
        )

    for update;


    if not found then

        raise exception
            'SANCTION_INTROUVABLE_OU_INACTIVE';

    end if;


    -- --------------------------------------------------------
    -- RÔLE DE LA CIBLE
    -- --------------------------------------------------------

    select
        coalesce(
            r.role,
            'utilisateur'
        )

    into
        v_role_cible

    from public.profiles p

    left join public.roles_utilisateurs r
        on r.utilisateur_id = p.id

    where
        p.id =
            v_utilisateur_id;


    -- Modérateur :
    -- pas d'action sur un autre gestionnaire.
    if
        v_role_acteur = 'moderateur'
        and
        v_role_cible in (
            'moderateur',
            'administrateur'
        )
    then

        raise exception
            'CIBLE_HIERARCHIQUE_PROTEGEE';

    end if;


    -- Administrateur :
    -- pas d'action sur un administrateur.
    if
        v_role_acteur = 'administrateur'
        and
        v_role_cible = 'administrateur'
    then

        raise exception
            'CIBLE_HIERARCHIQUE_PROTEGEE';

    end if;


    update public.sanctions_utilisateurs s
    set
        levee_at = now(),
        levee_par = v_acteur_id,
        motif_levee = v_motif

    where
        s.id = p_sanction_id;


    insert into public.journal_administration (
        acteur_id,
        action,
        utilisateur_cible_id,
        sanction_id,
        details
    )
    values (
        v_acteur_id,
        'levee_sanction_utilisateur',
        v_utilisateur_id,
        p_sanction_id,

        jsonb_build_object(
            'type_sanction',
            v_type_sanction,

            'motif',
            v_motif
        )
    );


    return true;

end;
$$;


revoke all
on function public.admin_lever_sanction(
    uuid,
    text
)
from public;

revoke all
on function public.admin_lever_sanction(
    uuid,
    text
)
from anon;

grant execute
on function public.admin_lever_sanction(
    uuid,
    text
)
to authenticated;

-- ============================================================
-- GESTION DES RÔLES
-- ADMINISTRATEUR UNIQUEMENT
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

    v_nombre_administrateurs bigint;
begin

    v_admin_id :=
        auth.uid();


    if v_admin_id is null then
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


    -- --------------------------------------------------------
    -- ADMINISTRATEUR STRICTEMENT
    -- --------------------------------------------------------

    if not exists (
        select 1

        from public.roles_utilisateurs r

        where
            r.utilisateur_id =
                v_admin_id

            and
            r.role =
                'administrateur'
    ) then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    -- --------------------------------------------------------
    -- NOUVEAU RÔLE
    -- --------------------------------------------------------

    if
        p_role is null
        or
        p_role not in (
            'utilisateur',
            'moderateur',
            'administrateur'
        )
    then

        raise exception
            'ROLE_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- CIBLE
    -- --------------------------------------------------------

    if not exists (
        select 1

        from public.profiles p

        where
            p.id =
                p_utilisateur_id
    ) then

        raise exception
            'UTILISATEUR_INTROUVABLE';

    end if;


    -- --------------------------------------------------------
    -- INTERDICTION DE MODIFIER SON PROPRE RÔLE
    -- --------------------------------------------------------

    if
        p_utilisateur_id =
        v_admin_id
    then

        raise exception
            'MODIFICATION_ROLE_PROPRE_INTERDITE';

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
        on r.utilisateur_id =
            p.id

    where
        p.id =
            p_utilisateur_id;


    if
        v_role_actuel =
        p_role
    then

        return p_role;

    end if;


    -- --------------------------------------------------------
    -- PROTECTION DU DERNIER ADMIN
    -- --------------------------------------------------------

    if
        v_role_actuel =
            'administrateur'

        and
        p_role <>
            'administrateur'
    then

        select
            count(*)::bigint

        into
            v_nombre_administrateurs

        from public.roles_utilisateurs r

        where
            r.role =
                'administrateur';


        if
            v_nombre_administrateurs <= 1
        then

            raise exception
                'DERNIER_ADMINISTRATEUR';

        end if;

    end if;


    -- --------------------------------------------------------
    -- APPLICATION
    -- --------------------------------------------------------

    if p_role =
       'utilisateur' then

        delete from public.roles_utilisateurs r

        where
            r.utilisateur_id =
                p_utilisateur_id;

    else

        insert into public.roles_utilisateurs (
            utilisateur_id,
            role,
            attribue_par,
            updated_at
        )
        values (
            p_utilisateur_id,
            p_role,
            v_admin_id,
            now()
        )

        on conflict (
            utilisateur_id
        )
        do update set
            role =
                excluded.role,

            attribue_par =
                excluded.attribue_par,

            updated_at =
                now();

    end if;


    -- --------------------------------------------------------
    -- JOURNAL
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