create or replace function public.ouvrir_conversation_participant(
    p_sortie_id uuid,
    p_utilisateur_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_conversation_id uuid;
begin

    v_user_id := auth.uid();


    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    -- --------------------------------------------------------
    -- L'utilisateur connecté doit être l'organisateur.
    -- La sortie doit être planifiée et future.
    -- --------------------------------------------------------

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


    -- --------------------------------------------------------
    -- Impossible de se contacter soi-même.
    -- --------------------------------------------------------

    if p_utilisateur_id = v_user_id then

        raise exception
            'Impossible de creer une conversation avec soi-meme';

    end if;


    -- --------------------------------------------------------
    -- La personne ciblée doit :
    --
    -- SOIT être déjà participante
    -- SOIT avoir une demande en attente.
    -- --------------------------------------------------------

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


    -- --------------------------------------------------------
    -- Conversation déjà existante
    -- --------------------------------------------------------

    select c.id
    into v_conversation_id
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id
      and c.utilisateur_id = p_utilisateur_id;


    if v_conversation_id is not null then
        return v_conversation_id;
    end if;


    -- --------------------------------------------------------
    -- Nouvelle conversation
    -- --------------------------------------------------------

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
$$;


revoke all
on function public.ouvrir_conversation_participant(uuid, uuid)
from public;


grant execute
on function public.ouvrir_conversation_participant(uuid, uuid)
to authenticated;