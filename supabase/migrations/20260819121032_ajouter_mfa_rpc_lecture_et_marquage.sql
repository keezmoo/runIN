begin;


-- ============================================================
-- MARQUER LES MESSAGES COMME LUS
-- ============================================================

create or replace function public.marquer_messages_comme_lus(
    p_conversation_id uuid
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
    v_nombre integer;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;

    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    if not exists (
        select 1
        from public.conversations_sortie c
        join public.sorties s
            on s.id = c.sortie_id
        where c.id = p_conversation_id
          and (
              c.utilisateur_id = v_user_id
              or s.organisateur_id = v_user_id
          )
    ) then
        raise exception 'Conversation non autorisee';
    end if;


    update public.messages
    set lu_at = now()
    where conversation_id = p_conversation_id
      and expediteur_id <> v_user_id
      and lu_at is null;


    get diagnostics
        v_nombre = row_count;

    return v_nombre;

end;
$function$;


-- ============================================================
-- MARQUER UNE NOTIFICATION COMME LUE
-- ============================================================

create or replace function public.marquer_notification_lue(
    p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;

    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    update public.notifications
    set lu_at = coalesce(lu_at, now())
    where id = p_notification_id
      and utilisateur_id = v_user_id;


    if not found then
        raise exception 'Notification introuvable ou non autorisee';
    end if;

end;
$function$;


-- ============================================================
-- MARQUER TOUTES LES NOTIFICATIONS COMME LUES
-- ============================================================

create or replace function public.marquer_toutes_notifications_lues()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
    v_nombre integer;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;

    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    update public.notifications
    set lu_at = now()
    where utilisateur_id = v_user_id
      and lu_at is null;


    get diagnostics
        v_nombre = row_count;

    return v_nombre;

end;
$function$;


-- ============================================================
-- COOLDOWN AVANT REINSCRIPTION
-- ============================================================

create or replace function public.secondes_avant_reinscription_sortie(
    p_sortie_id uuid
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_user_id uuid;
    v_secondes integer;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;

    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
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
      and c.utilisateur_id = v_user_id;


    return coalesce(v_secondes, 0);

end;
$function$;


-- ============================================================
-- PERMISSIONS EXPLICITES
-- ============================================================

revoke all
on function public.marquer_messages_comme_lus(uuid)
from public, anon, authenticated;

grant execute
on function public.marquer_messages_comme_lus(uuid)
to authenticated, service_role;


revoke all
on function public.marquer_notification_lue(uuid)
from public, anon, authenticated;

grant execute
on function public.marquer_notification_lue(uuid)
to authenticated, service_role;


revoke all
on function public.marquer_toutes_notifications_lues()
from public, anon, authenticated;

grant execute
on function public.marquer_toutes_notifications_lues()
to authenticated, service_role;


revoke all
on function public.secondes_avant_reinscription_sortie(uuid)
from public, anon, authenticated;

grant execute
on function public.secondes_avant_reinscription_sortie(uuid)
to authenticated, service_role;


commit;