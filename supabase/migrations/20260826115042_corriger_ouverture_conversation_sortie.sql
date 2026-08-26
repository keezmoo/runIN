create or replace function public.ouvrir_conversation_sortie(
    p_sortie_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid;
    v_organisateur_id uuid;
    v_statut text;
    v_date_depart timestamptz;
    v_conversation_id uuid;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'UTILISATEUR_NON_AUTHENTIFIE';
    end if;

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
        v_date_depart
    from public.sorties s
    where s.id = p_sortie_id;

    if not found then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    if v_organisateur_id = v_user_id then
        raise exception 'ORGANISATEUR_DE_LA_SORTIE';
    end if;


    if
        v_statut <> 'planifiee'
        or v_date_depart <= now()
    then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if public.est_relation_bloquee(v_organisateur_id) then
        raise exception 'RELATION_BLOQUEE';
    end if;


    select c.id
    into v_conversation_id
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id
      and c.utilisateur_id = v_user_id;

    if v_conversation_id is not null then
        return v_conversation_id;
    end if;


    insert into public.conversations_sortie (
        sortie_id,
        utilisateur_id
    )
    values (
        p_sortie_id,
        v_user_id
    )
    on conflict (
        sortie_id,
        utilisateur_id
    )
    do nothing
    returning id
    into v_conversation_id;


    if v_conversation_id is null then
        select c.id
        into v_conversation_id
        from public.conversations_sortie c
        where c.sortie_id = p_sortie_id
          and c.utilisateur_id = v_user_id;
    end if;


    return v_conversation_id;

end;
$function$;


revoke all on function public.ouvrir_conversation_sortie(uuid)
from public;

revoke all on function public.ouvrir_conversation_sortie(uuid)
from anon;

grant execute on function public.ouvrir_conversation_sortie(uuid)
to authenticated;

grant execute on function public.ouvrir_conversation_sortie(uuid)
to service_role;