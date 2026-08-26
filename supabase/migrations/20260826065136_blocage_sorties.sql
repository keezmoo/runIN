-- ============================================================
-- UTILISATEURS INDISPONIBLES POUR L'UTILISATEUR CONNECTÉ
-- ============================================================

create or replace function public.mes_utilisateurs_indisponibles()
returns table (
    utilisateur_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select distinct
        case
            when b.bloqueur_id = auth.uid()
                then b.bloque_id
            else b.bloqueur_id
        end as utilisateur_id
    from public.blocages b
    where
        auth.uid() is not null
        and (
            b.bloqueur_id = auth.uid()
            or b.bloque_id = auth.uid()
        );
$$;

revoke all
on function public.mes_utilisateurs_indisponibles()
from public;

grant execute
on function public.mes_utilisateurs_indisponibles()
to authenticated;


-- ============================================================
-- BLOQUER UN UTILISATEUR
-- ============================================================
-- Remplace la version précédente.
--
-- En plus des abonnements :
-- - retire les participations futures lorsque l'un est
--   organisateur de la sortie de l'autre ;
-- - supprime les demandes en attente correspondantes.
--
-- Deux simples co-participants d'une sortie organisée
-- par un tiers restent inscrits.

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


    -- Blocage

    insert into public.blocages (
        bloqueur_id,
        bloque_id
    )
    values (
        v_utilisateur_id,
        p_utilisateur_id
    )
    on conflict do nothing;


    -- Abonnements supprimés dans les deux sens

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


    -- Participations futures :
    -- A organise et B participe
    -- OU B organise et A participe.

    delete from public.participations p
    using public.sorties s
    where
        p.sortie_id = s.id
        and s.statut = 'planifiee'
        and s.date_heure_depart > now()
        and (
            (
                s.organisateur_id = v_utilisateur_id
                and p.utilisateur_id = p_utilisateur_id
            )
            or
            (
                s.organisateur_id = p_utilisateur_id
                and p.utilisateur_id = v_utilisateur_id
            )
        );


    -- Même principe pour les demandes encore en attente.

    delete from public.demandes_participation d
    using public.sorties s
    where
        d.sortie_id = s.id
        and d.statut = 'en_attente'
        and s.statut = 'planifiee'
        and s.date_heure_depart > now()
        and (
            (
                s.organisateur_id = v_utilisateur_id
                and d.utilisateur_id = p_utilisateur_id
            )
            or
            (
                s.organisateur_id = p_utilisateur_id
                and d.utilisateur_id = v_utilisateur_id
            )
        );

end;
$$;

revoke all
on function public.bloquer_utilisateur(uuid)
from public;

grant execute
on function public.bloquer_utilisateur(uuid)
to authenticated;