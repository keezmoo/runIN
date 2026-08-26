-- ============================================================
-- BLOCAGE DES UTILISATEURS
-- ============================================================

create table public.blocages (
    bloqueur_id uuid not null,
    bloque_id uuid not null,
    created_at timestamptz not null default now(),

    constraint blocages_pkey
        primary key (bloqueur_id, bloque_id),

    constraint blocages_bloqueur_fkey
        foreign key (bloqueur_id)
        references public.profiles(id)
        on delete cascade,

    constraint blocages_bloque_fkey
        foreign key (bloque_id)
        references public.profiles(id)
        on delete cascade,

    constraint blocages_pas_soi_meme
        check (bloqueur_id <> bloque_id)
);


-- La clé primaire indexe déjà efficacement bloqueur_id.
-- Cet index sert aux recherches dans l'autre sens :
-- "qui m'a bloqué ?"

create index blocages_bloque_id_idx
    on public.blocages(bloque_id);


-- ============================================================
-- RLS
-- ============================================================

alter table public.blocages enable row level security;


-- Un utilisateur peut uniquement voir les personnes
-- qu'il a lui-même bloquées.
--
-- Il ne peut donc pas consulter directement la liste
-- des personnes qui l'ont bloqué.

create policy "Voir ses propres blocages"
on public.blocages
for select
to authenticated
using (
    bloqueur_id = auth.uid()
);


-- Les insertions et suppressions ne seront PAS faites
-- directement depuis le client.
-- Elles passeront obligatoirement par les RPC ci-dessous.

revoke insert, update, delete
on public.blocages
from authenticated;

grant select
on public.blocages
to authenticated;


-- ============================================================
-- SAVOIR SI UNE RELATION EST BLOQUÉE
-- ============================================================
--
-- Retourne true si :
-- A bloque B
-- OU
-- B bloque A
--
-- La fonction ne travaille qu'entre l'utilisateur connecté
-- et l'utilisateur indiqué.

create or replace function public.est_relation_bloquee(
    p_autre_utilisateur_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        auth.uid() is not null
        and exists (
            select 1
            from public.blocages b
            where
                (
                    b.bloqueur_id = auth.uid()
                    and b.bloque_id = p_autre_utilisateur_id
                )
                or
                (
                    b.bloqueur_id = p_autre_utilisateur_id
                    and b.bloque_id = auth.uid()
                )
        );
$$;

revoke all
on function public.est_relation_bloquee(uuid)
from public;

grant execute
on function public.est_relation_bloquee(uuid)
to authenticated;


-- ============================================================
-- BLOQUER UN UTILISATEUR
-- ============================================================

create or replace function public.bloquer_utilisateur(
    p_utilisateur_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_utilisateur_id uuid := auth.uid();
begin

    if v_utilisateur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if p_utilisateur_id is null then
        raise exception 'UTILISATEUR_INVALIDE';
    end if;


    if p_utilisateur_id = v_utilisateur_id then
        raise exception 'BLOCAGE_SOI_MEME_INTERDIT';
    end if;


    if not exists (
        select 1
        from public.profiles
        where id = p_utilisateur_id
    ) then
        raise exception 'PROFIL_INTROUVABLE';
    end if;


    -- Création du blocage.
    -- Si l'utilisateur est déjà bloqué, aucune erreur.

    insert into public.blocages (
        bloqueur_id,
        bloque_id
    )
    values (
        v_utilisateur_id,
        p_utilisateur_id
    )
    on conflict do nothing;


    -- Suppression des abonnements dans les DEUX sens.

    delete from public.suivis
    where
        (
            utilisateur_id = v_utilisateur_id
            and profil_suivi_id = p_utilisateur_id
        )
        or
        (
            utilisateur_id = p_utilisateur_id
            and profil_suivi_id = v_utilisateur_id
        );

end;
$$;

revoke all
on function public.bloquer_utilisateur(uuid)
from public;

grant execute
on function public.bloquer_utilisateur(uuid)
to authenticated;


-- ============================================================
-- DÉBLOQUER UN UTILISATEUR
-- ============================================================

create or replace function public.debloquer_utilisateur(
    p_utilisateur_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_utilisateur_id uuid := auth.uid();
begin

    if v_utilisateur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    delete from public.blocages
    where
        bloqueur_id = v_utilisateur_id
        and bloque_id = p_utilisateur_id;

end;
$$;

revoke all
on function public.debloquer_utilisateur(uuid)
from public;

grant execute
on function public.debloquer_utilisateur(uuid)
to authenticated;


-- ============================================================
-- EMPÊCHER LE SUIVI EN CAS DE BLOCAGE
-- ============================================================

drop policy if exists "Ajouter ses propres suivis"
on public.suivis;


create policy "Ajouter ses propres suivis"
on public.suivis
for insert
to authenticated
with check (
    utilisateur_id = auth.uid()
    and profil_suivi_id <> auth.uid()
    and not public.est_relation_bloquee(profil_suivi_id)
);