-- ============================================================
-- RÔLES GLOBAUX RUNIN
-- ============================================================

create table public.roles_utilisateurs (
    utilisateur_id uuid primary key
        references public.profiles(id)
        on delete cascade,

    role text not null
        check (
            role in (
                'moderateur',
                'administrateur'
            )
        ),

    attribue_par uuid null
        references public.profiles(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.roles_utilisateurs
enable row level security;


-- ============================================================
-- LECTURE DE SON PROPRE RÔLE
-- ============================================================

create policy "roles_lecture_propre"
on public.roles_utilisateurs
for select
to authenticated
using (
    utilisateur_id = auth.uid()
);


-- ============================================================
-- RÔLE DE L'UTILISATEUR COURANT
--
-- Aucun rôle enregistré = utilisateur classique.
-- ============================================================

create or replace function public.mon_role_application()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(
        (
            select r.role
            from public.roles_utilisateurs r
            where r.utilisateur_id = auth.uid()
        ),
        'utilisateur'
    );
$$;

revoke all
on function public.mon_role_application()
from public;

revoke all
on function public.mon_role_application()
from anon;

grant execute
on function public.mon_role_application()
to authenticated;


-- ============================================================
-- FONCTIONS INTERNES D'AUTORISATION
-- ============================================================

create schema if not exists runin_private;


create or replace function runin_private.est_administrateur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = auth.uid()
            and r.role = 'administrateur'
    );
$$;


create or replace function runin_private.est_moderateur_ou_administrateur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = auth.uid()
            and r.role in (
                'moderateur',
                'administrateur'
            )
    );
$$;


revoke all
on function runin_private.est_administrateur()
from public;

revoke all
on function runin_private.est_administrateur()
from anon;

grant execute
on function runin_private.est_administrateur()
to authenticated;


revoke all
on function runin_private.est_moderateur_ou_administrateur()
from public;

revoke all
on function runin_private.est_moderateur_ou_administrateur()
from anon;

grant execute
on function runin_private.est_moderateur_ou_administrateur()
to authenticated;


-- ============================================================
-- IMPORTANT
--
-- Aucune policy INSERT / UPDATE / DELETE.
--
-- Un utilisateur ne peut donc jamais :
-- - devenir modérateur lui-même ;
-- - devenir administrateur lui-même ;
-- - modifier le rôle d'un autre utilisateur.
--
-- Les changements de rôles passeront plus tard par des RPC
-- administratives sécurisées.
-- ============================================================