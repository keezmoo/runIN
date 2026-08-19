begin;

-- ============================================================
-- OUVRIR UNE CONVERSATION AVEC UN PARTICIPANT
-- ============================================================

create or replace function public.ouvrir_conversation_participant(
    p_sortie_id uuid,
    p_utilisateur_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
    v_conversation_id uuid;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    -- MFA
    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    -- L'utilisateur connecté doit être l'organisateur.
    -- La sortie doit être planifiée et future.

    if not exists (
        select 1
        from public.sorties s
        where s.id = p_sortie_id
          and s.organisateur_id = v_user_id
          and s.statut = 'planifiee'
          and s.date_heure_depart > now()
    ) then
        raise exception
            'Sortie non autorisee pour cette conversation';
    end if;


    if p_utilisateur_id = v_user_id then
        raise exception
            'Impossible de creer une conversation avec soi-meme';
    end if;


    -- La personne ciblée doit être participante
    -- ou avoir une demande en attente.

    if not (
        exists (
            select 1
            from public.participations p
            where p.sortie_id = p_sortie_id
              and p.utilisateur_id = p_utilisateur_id
        )
        or
        exists (
            select 1
            from public.demandes_participation d
            where d.sortie_id = p_sortie_id
              and d.utilisateur_id = p_utilisateur_id
              and d.statut = 'en_attente'
        )
    ) then
        raise exception
            'Cet utilisateur ne participe pas et n''a aucune demande en attente pour cette sortie';
    end if;


    select c.id
    into v_conversation_id
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id
      and c.utilisateur_id = p_utilisateur_id;


    if v_conversation_id is not null then
        return v_conversation_id;
    end if;


    insert into public.conversations_sortie (
        sortie_id,
        utilisateur_id
    )
    values (
        p_sortie_id,
        p_utilisateur_id
    )
    returning id
    into v_conversation_id;


    return v_conversation_id;

end;
$function$;


-- ============================================================
-- SUPPRIMER UNE SORTIE SANS INTERACTION
-- ============================================================

create or replace function public.supprimer_sortie_sans_interaction(
    p_sortie_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
    v_organisateur_id uuid;
    v_statut text;
    v_date_heure_depart timestamptz;
begin

    v_user_id := auth.uid();


    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    -- MFA
    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    select
        s.organisateur_id,
        s.statut,
        s.date_heure_depart
    into
        v_organisateur_id,
        v_statut,
        v_date_heure_depart
    from public.sorties s
    where s.id = p_sortie_id
    for update;


    if not found then
        raise exception 'Sortie introuvable';
    end if;


    if v_organisateur_id <> v_user_id then
        raise exception
            'Vous ne pouvez pas supprimer cette sortie';
    end if;


    if v_statut <> 'planifiee' then
        raise exception
            'Cette sortie ne peut plus etre supprimee';
    end if;


    if v_date_heure_depart <= now() then
        raise exception
            'Une sortie passee ne peut pas etre supprimee';
    end if;


    if exists (
        select 1
        from public.participations p
        where p.sortie_id = p_sortie_id
    ) then
        raise exception
            'Cette sortie possede deja des participants';
    end if;


    if exists (
        select 1
        from public.demandes_participation d
        where d.sortie_id = p_sortie_id
    ) then
        raise exception
            'Cette sortie possede deja des demandes de participation';
    end if;


    if exists (
        select 1
        from public.conversations_sortie c
        where c.sortie_id = p_sortie_id
    ) then
        raise exception
            'Cette sortie possede deja une conversation';
    end if;


    delete from public.sorties
    where id = p_sortie_id;

end;
$function$;

-- ============================================================
-- PERMISSIONS RPC
-- Les deux fonctions doivent être appelables uniquement
-- par les utilisateurs authentifiés et service_role.
-- ============================================================

revoke all
on function public.ouvrir_conversation_participant(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.ouvrir_conversation_participant(uuid, uuid)
to authenticated, service_role;


revoke all
on function public.supprimer_sortie_sans_interaction(uuid)
from public, anon, authenticated;

grant execute
on function public.supprimer_sortie_sans_interaction(uuid)
to authenticated, service_role;

commit;