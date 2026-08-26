-- ============================================================
-- EMPÊCHER UNE PARTICIPATION ENTRE UTILISATEURS BLOQUÉS
-- ============================================================

create or replace function public.verifier_blocage_participation()
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
                b.bloqueur_id = new.utilisateur_id
                and b.bloque_id = v_organisateur_id
            )
            or
            (
                b.bloqueur_id = v_organisateur_id
                and b.bloque_id = new.utilisateur_id
            )
    ) then
        raise exception 'RELATION_BLOQUEE';
    end if;

    return new;
end;
$$;


drop trigger if exists verifier_blocage_participation
on public.participations;

create trigger verifier_blocage_participation
before insert
on public.participations
for each row
execute function public.verifier_blocage_participation();


-- ============================================================
-- EMPÊCHER UNE DEMANDE DE PARTICIPATION
-- ENTRE UTILISATEURS BLOQUÉS
-- ============================================================

create or replace function public.verifier_blocage_demande_participation()
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
                b.bloqueur_id = new.utilisateur_id
                and b.bloque_id = v_organisateur_id
            )
            or
            (
                b.bloqueur_id = v_organisateur_id
                and b.bloque_id = new.utilisateur_id
            )
    ) then
        raise exception 'RELATION_BLOQUEE';
    end if;

    return new;
end;
$$;


drop trigger if exists verifier_blocage_demande_participation
on public.demandes_participation;

create trigger verifier_blocage_demande_participation
before insert
on public.demandes_participation
for each row
execute function public.verifier_blocage_demande_participation();