create or replace function public.retirer_participant_sortie(
    p_sortie_id uuid,
    p_utilisateur_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_statut_sortie text;
    v_date_depart timestamptz;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    if not public.session_mfa_autorisee() then
        raise exception 'Authentification MFA requise';
    end if;


    select
        s.organisateur_id,
        s.titre,
        s.statut,
        s.date_heure_depart
    into
        v_organisateur_id,
        v_titre_sortie,
        v_statut_sortie,
        v_date_depart
    from public.sorties s
    where s.id = p_sortie_id
    for update;


    if not found then
        raise exception 'Sortie introuvable';
    end if;


    if v_organisateur_id <> v_user_id then
        raise exception 'Action reservee a l''organisateur';
    end if;


    if v_statut_sortie <> 'planifiee' then
        raise exception 'La sortie n''est plus planifiee';
    end if;


    if v_date_depart <= now() then
        raise exception 'La sortie a deja commence';
    end if;


    if p_utilisateur_id = v_user_id then
        raise exception 'L''organisateur ne peut pas se retirer lui-meme';
    end if;


    if not exists (
        select 1
        from public.participations p
        where p.sortie_id = p_sortie_id
          and p.utilisateur_id = p_utilisateur_id
    ) then
        raise exception 'Cet utilisateur ne participe pas a cette sortie';
    end if;


    -- Si une demande avait été acceptée,
    -- elle devient révoquée.

    update public.demandes_participation
    set statut = 'revoquee'
    where id = (
        select d.id
        from public.demandes_participation d
        where d.sortie_id = p_sortie_id
          and d.utilisateur_id = p_utilisateur_id
          and d.statut = 'acceptee'
        order by d.created_at desc
        limit 1
    );


    -- IMPORTANT :
    -- l'utilisateur est inscrit dans la liste
    -- d'exclusion AVANT de supprimer sa participation.

    insert into public.exclusions_sortie (
        sortie_id,
        utilisateur_id
    )
    values (
        p_sortie_id,
        p_utilisateur_id
    )
    on conflict (
        sortie_id,
        utilisateur_id
    )
    do nothing;


    delete from public.participations
    where sortie_id = p_sortie_id
      and utilisateur_id = p_utilisateur_id;


    insert into public.notifications (
        utilisateur_id,
        type,
        acteur_id,
        sortie_id,
        titre,
        contenu,
        lien
    )
    values (
        p_utilisateur_id,
        'participation_revoquee',
        v_user_id,
        p_sortie_id,
        'Participation retirée',
        'L''organisateur vous a retiré de la sortie « '
            || v_titre_sortie
            || ' ».',
        '/sorties/' || p_sortie_id::text
    );

end;
$$;


revoke all
on function public.retirer_participant_sortie(uuid, uuid)
from public;


grant execute
on function public.retirer_participant_sortie(uuid, uuid)
to authenticated;