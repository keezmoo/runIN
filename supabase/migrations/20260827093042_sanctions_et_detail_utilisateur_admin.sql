-- ============================================================
-- SANCTIONS UTILISATEURS
-- ============================================================

create table public.sanctions_utilisateurs (
    id uuid primary key default gen_random_uuid(),

    utilisateur_id uuid not null
        references public.profiles(id)
        on delete cascade,

    type text not null
        check (
            type in (
                'suspension',
                'bannissement'
            )
        ),

    motif text not null
        check (
            char_length(trim(motif)) between 3 and 1000
        ),

    date_debut timestamptz not null default now(),

    -- NULL pour un bannissement sans date de fin.
    date_fin timestamptz null,

    cree_par uuid not null
        references public.profiles(id)
        on delete restrict,

    created_at timestamptz not null default now(),

    levee_at timestamptz null,

    levee_par uuid null
        references public.profiles(id)
        on delete set null,

    motif_levee text null
        check (
            motif_levee is null
            or char_length(trim(motif_levee)) between 3 and 1000
        ),

    constraint sanctions_dates_check
        check (
            date_fin is null
            or date_fin > date_debut
        ),

    constraint sanctions_type_date_check
        check (
            (
                type = 'suspension'
                and date_fin is not null
            )
            or
            (
                type = 'bannissement'
                and date_fin is null
            )
        )
);


create index sanctions_utilisateurs_utilisateur_idx
on public.sanctions_utilisateurs (
    utilisateur_id,
    created_at desc
);


alter table public.sanctions_utilisateurs
enable row level security;


-- Aucun accès direct depuis le navigateur.
revoke all
on table public.sanctions_utilisateurs
from anon;

revoke all
on table public.sanctions_utilisateurs
from authenticated;


-- ============================================================
-- FICHE ADMINISTRATIVE D'UN UTILISATEUR
-- ============================================================

create or replace function public.admin_detail_utilisateur(
    p_utilisateur_id uuid
)
returns table (
    utilisateur_id uuid,
    nom text,
    email text,
    age smallint,
    sexe text,
    description text,
    date_inscription timestamptz,
    derniere_connexion timestamptz,
    role text,
    nombre_sorties bigint,
    nombre_participations bigint,
    nombre_messages bigint,
    sanction_active_id uuid,
    sanction_active_type text,
    sanction_active_motif text,
    sanction_active_debut timestamptz,
    sanction_active_fin timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    if auth.uid() is null then
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
            r.utilisateur_id = auth.uid()
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    return query

    select
        p.id,
        p.nom,
        u.email::text,
        p.age,
        p.sexe,
        p.description,
        u.created_at,
        u.last_sign_in_at,

        coalesce(
            ru.role,
            'utilisateur'
        )::text,

        (
            select count(*)::bigint
            from public.sorties s
            where s.organisateur_id = p.id
        ),

        (
            select count(*)::bigint
            from public.participations pa
            where pa.utilisateur_id = p.id
        ),

        (
            select count(*)::bigint
            from public.messages m
            where m.expediteur_id = p.id
        ),

        sanction.id,
        sanction.type,
        sanction.motif,
        sanction.date_debut,
        sanction.date_fin

    from public.profiles p

    join auth.users u
        on u.id = p.id

    left join public.roles_utilisateurs ru
        on ru.utilisateur_id = p.id

    left join lateral (
        select
            s.id,
            s.type,
            s.motif,
            s.date_debut,
            s.date_fin

        from public.sanctions_utilisateurs s

        where
            s.utilisateur_id = p.id
            and s.levee_at is null
            and s.date_debut <= now()
            and (
                s.date_fin is null
                or s.date_fin > now()
            )

        order by s.created_at desc
        limit 1
    ) sanction
        on true

    where p.id = p_utilisateur_id;

end;
$$;


revoke all
on function public.admin_detail_utilisateur(uuid)
from public;

revoke all
on function public.admin_detail_utilisateur(uuid)
from anon;

grant execute
on function public.admin_detail_utilisateur(uuid)
to authenticated;


-- ============================================================
-- HISTORIQUE DES SANCTIONS
-- ============================================================

create or replace function public.admin_historique_sanctions(
    p_utilisateur_id uuid
)
returns table (
    id uuid,
    type text,
    motif text,
    date_debut timestamptz,
    date_fin timestamptz,
    created_at timestamptz,
    levee_at timestamptz,
    motif_levee text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    if auth.uid() is null then
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
            r.utilisateur_id = auth.uid()
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    return query

    select
        s.id,
        s.type,
        s.motif,
        s.date_debut,
        s.date_fin,
        s.created_at,
        s.levee_at,
        s.motif_levee

    from public.sanctions_utilisateurs s

    where
        s.utilisateur_id =
        p_utilisateur_id

    order by
        s.created_at desc;

end;
$$;


revoke all
on function public.admin_historique_sanctions(uuid)
from public;

revoke all
on function public.admin_historique_sanctions(uuid)
from anon;

grant execute
on function public.admin_historique_sanctions(uuid)
to authenticated;