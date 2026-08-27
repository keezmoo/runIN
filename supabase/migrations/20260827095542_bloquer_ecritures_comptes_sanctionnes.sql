-- ============================================================
-- BLOCAGE CENTRAL DES ÉCRITURES POUR LES COMPTES SANCTIONNÉS
-- ============================================================

create or replace function runin_private.refuser_ecriture_si_sanctionne()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_utilisateur_id uuid;
begin

    v_utilisateur_id := auth.uid();


    -- --------------------------------------------------------
    -- PAS DE SESSION UTILISATEUR
    --
    -- Permet notamment les opérations techniques utilisant
    -- le service_role, les cascades administratives, etc.
    -- --------------------------------------------------------

    if v_utilisateur_id is null then

        if TG_OP = 'DELETE' then
            return OLD;
        end if;

        return NEW;

    end if;


    -- --------------------------------------------------------
    -- SANCTION ACTIVE ?
    -- --------------------------------------------------------

    if exists (
        select 1

        from public.sanctions_utilisateurs s

        where
            s.utilisateur_id =
                v_utilisateur_id

            and s.levee_at is null

            and s.date_debut <= now()

            and (
                s.date_fin is null
                or s.date_fin > now()
            )
    ) then

        raise exception
            using
                errcode = 'P0001',
                message = 'COMPTE_SANCTIONNE';

    end if;


    -- --------------------------------------------------------
    -- AUTORISATION
    -- --------------------------------------------------------

    if TG_OP = 'DELETE' then
        return OLD;
    end if;

    return NEW;

end;
$$;


revoke all
on function runin_private.refuser_ecriture_si_sanctionne()
from public;

revoke all
on function runin_private.refuser_ecriture_si_sanctionne()
from anon;

revoke all
on function runin_private.refuser_ecriture_si_sanctionne()
from authenticated;


-- ============================================================
-- PROFILES
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.profiles;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.profiles
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- SORTIES
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.sorties;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.sorties
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- PARTICIPATIONS
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.participations;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.participations
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- DEMANDES DE PARTICIPATION
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.demandes_participation;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.demandes_participation
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- CONVERSATIONS
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.conversations_sortie;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.conversations_sortie
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- MESSAGES
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.messages;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.messages
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.notifications;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.notifications
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- SUIVIS
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.suivis;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.suivis
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- BLOCAGES
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.blocages;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.blocages
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- EXCLUSIONS DE SORTIE
-- ============================================================

drop trigger if exists
    refuser_ecriture_si_sanctionne
on public.exclusions_sortie;

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.exclusions_sortie
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();