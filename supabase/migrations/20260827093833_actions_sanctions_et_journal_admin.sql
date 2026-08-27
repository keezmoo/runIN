-- ============================================================
-- JOURNAL D'ADMINISTRATION
-- ============================================================

create table public.journal_administration (
    id uuid primary key default gen_random_uuid(),

    acteur_id uuid null
        references public.profiles(id)
        on delete set null,

    action text not null,

    utilisateur_cible_id uuid null
        references public.profiles(id)
        on delete set null,

    sanction_id uuid null
        references public.sanctions_utilisateurs(id)
        on delete set null,

    details jsonb not null
        default '{}'::jsonb,

    created_at timestamptz not null
        default now()
);


create index journal_administration_date_idx
on public.journal_administration (
    created_at desc
);


create index journal_administration_utilisateur_idx
on public.journal_administration (
    utilisateur_cible_id,
    created_at desc
);


alter table public.journal_administration
enable row level security;


-- Aucun accès direct depuis l'application.
revoke all
on table public.journal_administration
from anon;

revoke all
on table public.journal_administration
from authenticated;


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
    v_admin_id uuid;
    v_sanction_id uuid;
    v_sanction_active_id uuid;
    v_date_fin timestamptz;
    v_motif text;
begin

    v_admin_id := auth.uid();


    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    if v_admin_id is null then
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
    -- ADMINISTRATEUR
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
    -- UTILISATEUR CIBLE
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_utilisateur_id
    ) then
        raise exception 'UTILISATEUR_INTROUVABLE';
    end if;


    -- Impossible de se sanctionner soi-même.
    if p_utilisateur_id = v_admin_id then
        raise exception 'AUTO_SANCTION_INTERDITE';
    end if;


    -- Un administrateur ne peut pas être sanctionné
    -- depuis cette fonction standard.
    if exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = p_utilisateur_id
            and r.role = 'administrateur'
    ) then
        raise exception 'ADMINISTRATEUR_PROTEGE';
    end if;


    -- --------------------------------------------------------
    -- VALIDATION
    -- --------------------------------------------------------

    if p_type not in (
        'suspension',
        'bannissement'
    ) then
        raise exception 'TYPE_SANCTION_INVALIDE';
    end if;


    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if char_length(v_motif) < 3
       or char_length(v_motif) > 1000 then

        raise exception 'MOTIF_INVALIDE';

    end if;


    if p_type = 'suspension' then

        if p_duree_jours is null
           or p_duree_jours < 1
           or p_duree_jours > 365 then

            raise exception 'DUREE_SUSPENSION_INVALIDE';

        end if;

        v_date_fin :=
            now()
            + make_interval(
                days => p_duree_jours
            );

    else

        v_date_fin := null;

    end if;


    -- --------------------------------------------------------
    -- PAS DE DEUX SANCTIONS ACTIVES
    -- --------------------------------------------------------

    select
        s.id
    into
        v_sanction_active_id

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

    order by
        s.created_at desc

    limit 1;


    if v_sanction_active_id is not null then
        raise exception 'SANCTION_DEJA_ACTIVE';
    end if;


    -- --------------------------------------------------------
    -- CRÉATION SANCTION
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
        v_admin_id
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
        v_admin_id,

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
    v_admin_id uuid;
    v_utilisateur_id uuid;
    v_type text;
    v_motif text;
begin

    v_admin_id := auth.uid();


    if v_admin_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    if not exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = v_admin_id
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if char_length(v_motif) < 3
       or char_length(v_motif) > 1000 then

        raise exception 'MOTIF_INVALIDE';

    end if;


    select
        s.utilisateur_id,
        s.type

    into
        v_utilisateur_id,
        v_type

    from public.sanctions_utilisateurs s

    where
        s.id = p_sanction_id

        and s.levee_at is null

        and s.date_debut <= now()

        and (
            s.date_fin is null
            or s.date_fin > now()
        );


    if v_utilisateur_id is null then
        raise exception 'SANCTION_INTROUVABLE_OU_INACTIVE';
    end if;


    update public.sanctions_utilisateurs s
    set
        levee_at = now(),
        levee_par = v_admin_id,
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
        v_admin_id,
        'levee_sanction_utilisateur',
        v_utilisateur_id,
        p_sanction_id,

        jsonb_build_object(
            'type_sanction',
            v_type,
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