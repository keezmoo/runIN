-- ============================================================
-- INTERDIRE LA CRÉATION D'UNE CONVERSATION
-- ENTRE UTILISATEURS BLOQUÉS
-- ============================================================

create or replace function public.verifier_blocage_conversation_sortie()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_organisateur_id uuid;
begin

    select s.organisateur_id
    into v_organisateur_id
    from public.sorties s
    where s.id = new.sortie_id;

    if v_organisateur_id is null then
        raise exception 'SORTIE_INTROUVABLE';
    end if;

    if exists (
        select 1
        from public.blocages b
        where
            (
                b.bloqueur_id = v_organisateur_id
                and b.bloque_id = new.utilisateur_id
            )
            or
            (
                b.bloqueur_id = new.utilisateur_id
                and b.bloque_id = v_organisateur_id
            )
    ) then
        raise exception 'RELATION_BLOQUEE';
    end if;

    return new;
end;
$$;

revoke all
on function public.verifier_blocage_conversation_sortie()
from public;


drop trigger if exists verifier_blocage_conversation_sortie
on public.conversations_sortie;

create trigger verifier_blocage_conversation_sortie
before insert
on public.conversations_sortie
for each row
execute function public.verifier_blocage_conversation_sortie();


-- ============================================================
-- INTERDIRE LES NOUVEAUX MESSAGES
-- ENTRE UTILISATEURS BLOQUÉS
-- ============================================================

create or replace function public.verifier_blocage_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_organisateur_id uuid;
    v_participant_id uuid;
begin

    select
        s.organisateur_id,
        c.utilisateur_id
    into
        v_organisateur_id,
        v_participant_id
    from public.conversations_sortie c
    join public.sorties s
        on s.id = c.sortie_id
    where c.id = new.conversation_id;

    if v_organisateur_id is null
       or v_participant_id is null then
        raise exception 'CONVERSATION_INTROUVABLE';
    end if;

    if exists (
        select 1
        from public.blocages b
        where
            (
                b.bloqueur_id = v_organisateur_id
                and b.bloque_id = v_participant_id
            )
            or
            (
                b.bloqueur_id = v_participant_id
                and b.bloque_id = v_organisateur_id
            )
    ) then
        raise exception 'RELATION_BLOQUEE';
    end if;

    return new;
end;
$$;

revoke all
on function public.verifier_blocage_message()
from public;


drop trigger if exists verifier_blocage_message
on public.messages;

create trigger verifier_blocage_message
before insert
on public.messages
for each row
execute function public.verifier_blocage_message();