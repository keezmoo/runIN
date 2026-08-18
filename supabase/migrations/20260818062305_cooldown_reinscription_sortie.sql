-- ============================================================
-- COOLDOWN DE 30 SECONDES APRÈS :
-- - désinscription d'une sortie
-- - annulation d'une demande de participation
-- ============================================================


-- ------------------------------------------------------------
-- 1. Schéma interne non exposé par l'API
-- ------------------------------------------------------------

create schema if not exists runin_private;

revoke all
on schema runin_private
from public;

grant usage
on schema runin_private
to authenticated;


-- ------------------------------------------------------------
-- 2. Stockage du cooldown
-- ------------------------------------------------------------

create table if not exists runin_private.cooldowns_sortie (

    sortie_id uuid not null
        references public.sorties(id)
        on delete cascade,

    utilisateur_id uuid not null
        references public.profiles(id)
        on delete cascade,

    rejoindre_apres timestamptz not null,

    updated_at timestamptz not null
        default now(),

    primary key (
        sortie_id,
        utilisateur_id
    )
);


-- Aucun accès direct depuis le navigateur.

revoke all
on runin_private.cooldowns_sortie
from public, anon, authenticated;


-- ============================================================
-- 3. ENREGISTRER / RENOUVELER UN COOLDOWN
-- ============================================================

create or replace function runin_private.enregistrer_cooldown_sortie(
    p_sortie_id uuid,
    p_utilisateur_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

    insert into runin_private.cooldowns_sortie (
        sortie_id,
        utilisateur_id,
        rejoindre_apres,
        updated_at
    )
    values (
        p_sortie_id,
        p_utilisateur_id,
        now() + interval '30 seconds',
        now()
    )

    on conflict (
        sortie_id,
        utilisateur_id
    )

    do update
    set
        rejoindre_apres =
            greatest(
                runin_private.cooldowns_sortie.rejoindre_apres,
                excluded.rejoindre_apres
            ),

        updated_at = now();

end;
$$;


revoke all
on function runin_private.enregistrer_cooldown_sortie(uuid, uuid)
from public, anon, authenticated;


-- ============================================================
-- 4. DÉSINSCRIPTION D'UNE PARTICIPATION
-- ============================================================

create or replace function runin_private.cooldown_apres_desinscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    -- Seulement si la personne se désinscrit elle-même.
    --
    -- Si l'organisateur retire quelqu'un,
    -- ce n'est pas un cooldown :
    -- cette personne est déjà dans exclusions_sortie.

    if auth.uid() is not null
       and auth.uid() = old.utilisateur_id then

        perform runin_private.enregistrer_cooldown_sortie(
            old.sortie_id,
            old.utilisateur_id
        );

    end if;


    return old;

end;
$$;


revoke all
on function runin_private.cooldown_apres_desinscription()
from public;


drop trigger if exists
trigger_cooldown_apres_desinscription
on public.participations;


create trigger trigger_cooldown_apres_desinscription
after delete
on public.participations
for each row
execute function runin_private.cooldown_apres_desinscription();


-- ============================================================
-- 5. ANNULATION D'UNE DEMANDE DE PARTICIPATION
-- ============================================================

create or replace function runin_private.cooldown_apres_annulation_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    -- Cas actuel :
    -- suppression directe de la demande en attente.

    if tg_op = 'DELETE' then

        if old.statut = 'en_attente'
           and auth.uid() is not null
           and auth.uid() = old.utilisateur_id then

            perform runin_private.enregistrer_cooldown_sortie(
                old.sortie_id,
                old.utilisateur_id
            );

        end if;

        return old;

    end if;


    -- Protection également prévue si plus tard
    -- l'annulation devient un UPDATE :
    -- en_attente -> annulee.

    if tg_op = 'UPDATE' then

        if old.statut = 'en_attente'
           and new.statut = 'annulee'
           and auth.uid() is not null
           and auth.uid() = old.utilisateur_id then

            perform runin_private.enregistrer_cooldown_sortie(
                old.sortie_id,
                old.utilisateur_id
            );

        end if;

        return new;

    end if;


    return null;

end;
$$;


revoke all
on function runin_private.cooldown_apres_annulation_demande()
from public;


drop trigger if exists
trigger_cooldown_demande_delete
on public.demandes_participation;


create trigger trigger_cooldown_demande_delete
after delete
on public.demandes_participation
for each row
execute function runin_private.cooldown_apres_annulation_demande();


drop trigger if exists
trigger_cooldown_demande_annulee
on public.demandes_participation;


create trigger trigger_cooldown_demande_annulee
after update of statut
on public.demandes_participation
for each row
execute function runin_private.cooldown_apres_annulation_demande();


-- ============================================================
-- 6. FONCTION UTILISÉE PAR LES POLICIES RLS
-- ============================================================

create or replace function runin_private.reinscription_sortie_autorisee(
    p_sortie_id uuid,
    p_utilisateur_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select not exists (

        select 1

        from runin_private.cooldowns_sortie c

        where c.sortie_id = p_sortie_id

          and c.utilisateur_id =
              p_utilisateur_id

          and c.rejoindre_apres > now()

    );
$$;


revoke all
on function runin_private.reinscription_sortie_autorisee(uuid, uuid)
from public, anon;


grant execute
on function runin_private.reinscription_sortie_autorisee(uuid, uuid)
to authenticated;


-- ============================================================
-- 7. BLOQUE UNE PARTICIPATION PENDANT LE COOLDOWN
-- ============================================================

drop policy if exists
participations_cooldown_reinscription
on public.participations;


create policy participations_cooldown_reinscription
on public.participations

as restrictive

for insert

to authenticated

with check (

    runin_private.reinscription_sortie_autorisee(
        participations.sortie_id,
        participations.utilisateur_id
    )

);


-- ============================================================
-- 8. BLOQUE UNE NOUVELLE DEMANDE PENDANT LE COOLDOWN
-- ============================================================

drop policy if exists
demandes_cooldown_reinscription
on public.demandes_participation;


create policy demandes_cooldown_reinscription
on public.demandes_participation

as restrictive

for insert

to authenticated

with check (

    runin_private.reinscription_sortie_autorisee(
        demandes_participation.sortie_id,
        demandes_participation.utilisateur_id
    )

);


-- ============================================================
-- 9. RPC POUR L'INTERFACE :
--    combien de secondes reste-t-il ?
-- ============================================================

create or replace function public.secondes_avant_reinscription_sortie(
    p_sortie_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_secondes integer;
begin

    v_user_id := auth.uid();


    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    select
        greatest(
            0,
            ceil(
                extract(
                    epoch from (
                        c.rejoindre_apres - now()
                    )
                )
            )::integer
        )

    into v_secondes

    from runin_private.cooldowns_sortie c

    where c.sortie_id = p_sortie_id

      and c.utilisateur_id =
          v_user_id;


    return coalesce(
        v_secondes,
        0
    );

end;
$$;


revoke all
on function public.secondes_avant_reinscription_sortie(uuid)
from public, anon;


grant execute
on function public.secondes_avant_reinscription_sortie(uuid)
to authenticated;