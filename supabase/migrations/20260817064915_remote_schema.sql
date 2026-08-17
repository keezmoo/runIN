-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION public.accepter_demande_participation (
  p_demande_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_sortie_id uuid;
  v_utilisateur_id uuid;
  v_statut text;
  v_nb_max smallint;
  v_nb_actuel integer;
begin

  if auth.uid() is null then
    raise exception 'Utilisateur non authentifie';
  end if;

  -- Récupère et verrouille la demande + la sortie.
  select
    d.sortie_id,
    d.utilisateur_id,
    d.statut,
    s.nombre_max_participants
  into
    v_sortie_id,
    v_utilisateur_id,
    v_statut,
    v_nb_max
  from public.demandes_participation d
  join public.sorties s
    on s.id = d.sortie_id
  where d.id = p_demande_id
    and s.organisateur_id = auth.uid()
  for update of d, s;

  if not found then
    raise exception 'Demande introuvable ou non autorisee';
  end if;

  if v_statut <> 'en_attente' then
    raise exception 'Cette demande a deja ete traitee';
  end if;

  -- Si la personne est déjà participante,
  -- on considère simplement la demande acceptée.
  if exists (
    select 1
    from public.participations p
    where p.sortie_id = v_sortie_id
      and p.utilisateur_id = v_utilisateur_id
  ) then

    update public.demandes_participation
    set statut = 'acceptee'
    where id = p_demande_id;

    return;
  end if;

  -- Participants + organisateur.
  select 1 + count(*)
  into v_nb_actuel
  from public.participations p
  where p.sortie_id = v_sortie_id;

  if v_nb_actuel >= v_nb_max then
    raise exception 'La sortie est complete';
  end if;

  insert into public.participations (
    sortie_id,
    utilisateur_id
  )
  values (
    v_sortie_id,
    v_utilisateur_id
  );

  update public.demandes_participation
  set statut = 'acceptee'
  where id = p_demande_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.annuler_sortie (
  p_sortie_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin

  update public.sorties
  set statut = 'annulee'
  where id = p_sortie_id
    and organisateur_id = auth.uid()
    and statut = 'planifiee';

  if not found then
    raise exception 'Sortie introuvable ou non autorisee';
  end if;

  update public.demandes_participation
  set statut = 'annulee'
  where sortie_id = p_sortie_id
    and statut = 'en_attente';

end;
$function$;

CREATE FUNCTION public.envoyer_notification_email_vault()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_secret text;
begin

    -- Récupération du secret depuis Supabase Vault
    select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
    where name = 'runin_email_webhook_secret'
    limit 1;


    -- Sécurité : si le secret n'existe pas,
    -- on n'empêche surtout pas la création
    -- de la notification.
    if v_secret is null then

        raise warning
            'Secret runin_email_webhook_secret introuvable dans Vault';

        return new;

    end if;


    -- Appel asynchrone de l'Edge Function
    perform net.http_post(
        url :=
            'https://zrllbmdpwnbmrkydgyms.supabase.co/functions/v1/envoyer-notification-email',

        headers :=
            jsonb_build_object(
                'Content-Type',
                'application/json',

                'x-webhook-secret',
                v_secret
            ),

        body :=
            jsonb_build_object(
                'type',
                'INSERT',

                'table',
                TG_TABLE_NAME,

                'schema',
                TG_TABLE_SCHEMA,

                'record',
                to_jsonb(new),

                'old_record',
                null
            ),

        timeout_milliseconds :=
            5000
    );


    return new;

end;
$function$;

REVOKE ALL ON FUNCTION public.envoyer_notification_email_vault() FROM PUBLIC;

GRANT ALL ON FUNCTION public.envoyer_notification_email_vault() TO anon;

GRANT ALL ON FUNCTION public.envoyer_notification_email_vault() TO authenticated;

GRANT ALL ON FUNCTION public.envoyer_notification_email_vault() TO service_role;

CREATE OR REPLACE FUNCTION public.marquer_messages_comme_lus (
  p_conversation_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_user_id uuid;
    v_nombre integer;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    -- Vérifie que l'utilisateur appartient
    -- réellement à cette conversation
    if not exists (
        select 1
        from public.conversations_sortie c

        join public.sorties s
            on s.id = c.sortie_id

        where
            c.id = p_conversation_id

            and (
                c.utilisateur_id = v_user_id

                or

                s.organisateur_id = v_user_id
            )
    ) then
        raise exception 'Conversation non autorisee';
    end if;


    -- Marque uniquement les messages RECUS,
    -- jamais ses propres messages
    update public.messages
    set lu_at = now()
    where
        conversation_id = p_conversation_id

        and expediteur_id <> v_user_id

        and lu_at is null;


    get diagnostics
        v_nombre = row_count;


    return v_nombre;

end;
$function$;

CREATE OR REPLACE FUNCTION public.marquer_notification_lue (
  p_notification_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_user_id uuid;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
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

CREATE OR REPLACE FUNCTION public.marquer_toutes_notifications_lues()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_user_id uuid;
    v_nombre integer;
begin

    v_user_id := auth.uid();


    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
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

CREATE OR REPLACE FUNCTION public.mon_filtre_geographique()
  RETURNS TABLE (
    lieu_recherche     text,
    rayon_recherche_km smallint,
    latitude           double precision,
    longitude          double precision
  )
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  select
    p.lieu_recherche,
    p.rayon_recherche_km,

    extensions.st_y(
      p.position_recherche::extensions.geometry
    ) as latitude,

    extensions.st_x(
      p.position_recherche::extensions.geometry
    ) as longitude

  from public.profiles p

  where
    p.id = auth.uid()
    and p.position_recherche is not null;
$function$;

CREATE OR REPLACE FUNCTION public.nombre_messages_non_lus()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$

    select count(*)

    from public.messages m

    join public.conversations_sortie c
        on c.id = m.conversation_id

    join public.sorties s
        on s.id = c.sortie_id

    where
        m.lu_at is null

        and m.expediteur_id <>
            auth.uid()

        and (
            c.utilisateur_id =
                auth.uid()

            or

            s.organisateur_id =
                auth.uid()
        )

        -- Pas de badge pour une sortie annulée
        and s.statut = 'planifiee'

        -- Pas de badge pour une conversation
        -- dont le délai de 12 h est terminé
        and now() <=
            (
                s.date_heure_depart

                + make_interval(
                    mins =>
                        coalesce(
                            s.duree_estimee_minutes,
                            0
                        )
                )

                + interval '12 hours'
            );

$function$;

CREATE OR REPLACE FUNCTION public.nombre_notifications_non_lues()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$

    select count(*)
    from public.notifications n
    where n.utilisateur_id = auth.uid()
      and n.lu_at is null;

$function$;

CREATE OR REPLACE FUNCTION public.notifier_annulation_demande()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_nom_demandeur text;
    v_statut_sortie text;
begin

    -- ------------------------------------------------
    -- ON NE TRAITE QUE :
    -- en_attente → annulee
    -- ------------------------------------------------

    if old.statut <> 'en_attente'
       or new.statut <> 'annulee' then

        return new;

    end if;


    -- ------------------------------------------------
    -- INFORMATIONS SUR LA SORTIE
    -- ------------------------------------------------

    select
        s.organisateur_id,
        s.titre,
        s.statut
    into
        v_organisateur_id,
        v_titre_sortie,
        v_statut_sortie
    from public.sorties s
    where s.id = new.sortie_id;


    if not found then
        return new;
    end if;


    -- ------------------------------------------------
    -- SI LA SORTIE A ÉTÉ ANNULÉE
    --
    -- La demande est passée automatiquement
    -- à "annulee".
    --
    -- On ne doit donc PAS faire croire
    -- que le demandeur a annulé sa demande.
    -- ------------------------------------------------

    if v_statut_sortie = 'annulee' then
        return new;
    end if;


    -- ------------------------------------------------
    -- L'ANCIENNE NOTIFICATION
    -- "NOUVELLE DEMANDE"
    -- DEVIENT OBSOLÈTE
    -- ------------------------------------------------

    update public.notifications
    set lu_at = coalesce(
        lu_at,
        now()
    )
    where utilisateur_id =
              v_organisateur_id

      and demande_id =
              new.id

      and type =
              'demande_recue'

      and lu_at is null;


    -- ------------------------------------------------
    -- NOM DU DEMANDEUR
    -- ------------------------------------------------

    select
        p.nom
    into
        v_nom_demandeur
    from public.profiles p
    where p.id = new.utilisateur_id;


    -- ------------------------------------------------
    -- NOUVELLE NOTIFICATION
    -- DESTINÉE À L'ORGANISATEUR
    -- ------------------------------------------------

    insert into public.notifications (
        utilisateur_id,
        type,
        acteur_id,
        sortie_id,
        demande_id,
        titre,
        contenu,
        lien
    )
    values (
        v_organisateur_id,

        'demande_annulee',

        new.utilisateur_id,

        new.sortie_id,

        new.id,

        'Demande de participation annulée',

        coalesce(
            v_nom_demandeur,
            'Un utilisateur'
        )
        || ' a annulé sa demande pour « '
        || v_titre_sortie
        || ' ».',

        '/sorties/' ||
            new.sortie_id::text
    );


    return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.notifier_changement_sortie()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_destinataire uuid;
begin

    -- ==================================================
    -- ANNULATION DE LA SORTIE
    -- ==================================================

    if old.statut <> 'annulee'
       and new.statut = 'annulee' then


        -- Les anciennes notifications
        -- "Sortie modifiée" non lues
        -- deviennent obsolètes.
        update public.notifications
        set lu_at = coalesce(
            lu_at,
            now()
        )
        where sortie_id = new.id
          and type = 'sortie_modifiee'
          and lu_at is null;


        -- Notification de l'annulation
        -- aux participants et aux demandes
        -- encore en attente.
        insert into public.notifications (
            utilisateur_id,
            type,
            acteur_id,
            sortie_id,
            titre,
            contenu,
            lien
        )

        select
            destinataires.utilisateur_id,
            'sortie_annulee',
            new.organisateur_id,
            new.id,
            'Sortie annulée',
            'La sortie « '
                || new.titre
                || ' » a été annulée par l''organisateur.',
            '/sorties/' || new.id::text

        from (

            -- Participants inscrits
            select
                p.utilisateur_id
            from public.participations p
            where p.sortie_id = new.id


            union


            -- Demandes encore en attente
            select
                d.utilisateur_id
            from public.demandes_participation d
            where d.sortie_id = new.id
              and d.statut = 'en_attente'

        ) as destinataires

        where destinataires.utilisateur_id
              <> new.organisateur_id;


        -- Très important :
        -- une annulation ne doit pas également
        -- générer "Sortie modifiée".
        return new;

    end if;


    -- ==================================================
    -- MODIFICATION IMPORTANTE DE LA SORTIE
    -- ==================================================

    if old.statut = 'planifiee'
       and new.statut = 'planifiee'

       and (

            old.titre
                is distinct from
            new.titre

            or

            old.date_heure_depart
                is distinct from
            new.date_heure_depart

            or

            old.lieu_depart
                is distinct from
            new.lieu_depart

            or

            old.type_sortie
                is distinct from
            new.type_sortie

            or

            old.type_entrainement
                is distinct from
            new.type_entrainement

            or

            old.distance_km
                is distinct from
            new.distance_km

            or

            old.denivele_positif_m
                is distinct from
            new.denivele_positif_m

            or

            old.duree_estimee_minutes
                is distinct from
            new.duree_estimee_minutes

            or

            old.intensite
                is distinct from
            new.intensite

            or

            old.allure_secondes_km
                is distinct from
            new.allure_secondes_km

            or

            old.nombre_max_participants
                is distinct from
            new.nombre_max_participants

            or

            old.mode_inscription
                is distinct from
            new.mode_inscription
       )

    then


        -- ==================================================
        -- POUR CHAQUE PERSONNE CONCERNÉE
        -- ==================================================

        for v_destinataire in

            select
                destinataires.utilisateur_id

            from (

                -- Participants inscrits
                select
                    p.utilisateur_id
                from public.participations p
                where p.sortie_id = new.id


                union


                -- Demandes encore en attente
                select
                    d.utilisateur_id
                from public.demandes_participation d
                where d.sortie_id = new.id
                  and d.statut = 'en_attente'

            ) as destinataires

            where destinataires.utilisateur_id
                  <> new.organisateur_id

        loop


            -- ------------------------------------------------
            -- Une notification "Sortie modifiée"
            -- non lue existe déjà ?
            --
            -- On la réutilise au lieu d'en créer
            -- une deuxième.
            -- ------------------------------------------------

            update public.notifications
            set
                acteur_id =
                    new.organisateur_id,

                titre =
                    'Sortie modifiée',

                contenu =
                    'Des informations concernant « '
                    || new.titre
                    || ' » ont été modifiées par l''organisateur.',

                lien =
                    '/sorties/' || new.id::text,

                -- On remonte la notification
                -- à la date de la dernière modification.
                created_at =
                    now()

            where utilisateur_id =
                      v_destinataire

              and sortie_id =
                      new.id

              and type =
                      'sortie_modifiee'

              and lu_at is null;


            -- ------------------------------------------------
            -- Aucune notification non lue existante :
            -- on en crée une nouvelle.
            -- ------------------------------------------------

            if not found then

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
                    v_destinataire,
                    'sortie_modifiee',
                    new.organisateur_id,
                    new.id,
                    'Sortie modifiée',
                    'Des informations concernant « '
                        || new.titre
                        || ' » ont été modifiées par l''organisateur.',
                    '/sorties/' || new.id::text
                );

            end if;


        end loop;

    end if;


    return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.notifier_desinscription_participant()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_nom_participant text;
begin

    select
        s.organisateur_id,
        s.titre
    into
        v_organisateur_id,
        v_titre_sortie
    from public.sorties s
    where s.id = old.sortie_id;


    if not found then
        return old;
    end if;


    select
        p.nom
    into
        v_nom_participant
    from public.profiles p
    where p.id = old.utilisateur_id;


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
        v_organisateur_id,
        'participant_desinscrit',
        old.utilisateur_id,
        old.sortie_id,
        'Un participant s''est désinscrit',
        coalesce(
            v_nom_participant,
            'Un participant'
        )
        || ' ne participe plus à « '
        || v_titre_sortie
        || ' ».',
        '/sorties/' || old.sortie_id::text
    );


    return old;

end;
$function$;

CREATE OR REPLACE FUNCTION public.notifier_nouvelle_demande_participation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_nom_demandeur text;
begin

    -- Récupère la sortie concernée
    select
        s.organisateur_id,
        s.titre
    into
        v_organisateur_id,
        v_titre_sortie
    from public.sorties s
    where s.id = new.sortie_id;


    if v_organisateur_id is null then
        return new;
    end if;


    -- Récupère le nom de la personne
    -- ayant fait la demande
    select
        p.nom
    into
        v_nom_demandeur
    from public.profiles p
    where p.id = new.utilisateur_id;


    insert into public.notifications (
        utilisateur_id,
        type,
        acteur_id,
        sortie_id,
        demande_id,
        titre,
        contenu,
        lien
    )
    values (
        v_organisateur_id,
        'demande_recue',
        new.utilisateur_id,
        new.sortie_id,
        new.id,
        'Nouvelle demande de participation',
        coalesce(
            v_nom_demandeur,
            'Un utilisateur'
        )
        || ' souhaite participer à « '
        || v_titre_sortie
        || ' ».',
        '/sorties/' || new.sortie_id::text
    );


    return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.notifier_participation_automatique()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_nom_participant text;
    v_mode_inscription text;
    v_statut_sortie text;
begin

    -- Récupère les informations de la sortie
    select
        s.organisateur_id,
        s.titre,
        s.mode_inscription,
        s.statut
    into
        v_organisateur_id,
        v_titre_sortie,
        v_mode_inscription,
        v_statut_sortie
    from public.sorties s
    where s.id = new.sortie_id;


    if not found then
        return new;
    end if;


    -- Cette notification concerne uniquement
    -- les inscriptions automatiques.
    --
    -- Une participation créée après acceptation
    -- d'une demande ne doit pas produire
    -- cette notification.
    if v_mode_inscription <> 'automatique' then
        return new;
    end if;


    -- Sécurité supplémentaire
    if v_statut_sortie <> 'planifiee' then
        return new;
    end if;


    -- Récupère le nom du participant
    select
        p.nom
    into
        v_nom_participant
    from public.profiles p
    where p.id = new.utilisateur_id;


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
        v_organisateur_id,
        'participation_automatique',
        new.utilisateur_id,
        new.sortie_id,
        'Nouveau participant',
        coalesce(
            v_nom_participant,
            'Un utilisateur'
        )
        || ' participe maintenant à « '
        || v_titre_sortie
        || ' ».',
        '/sorties/' || new.sortie_id::text
    );


    return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.notifier_traitement_demande_participation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_organisateur_id uuid;
    v_titre_sortie text;
    v_type_notification text;
    v_titre_notification text;
    v_contenu_notification text;
begin

    -- Aucun changement de statut
    if old.statut is not distinct from new.statut then
        return new;
    end if;


    -- On ne traite ici que :
    -- en_attente → acceptee
    -- en_attente → refusee
    if old.statut <> 'en_attente'
       or new.statut not in (
            'acceptee',
            'refusee'
       ) then

        return new;

    end if;


    select
        s.organisateur_id,
        s.titre
    into
        v_organisateur_id,
        v_titre_sortie
    from public.sorties s
    where s.id = new.sortie_id;


    if not found then
        return new;
    end if;


    -- ------------------------------------------------
    -- L'ancienne notification de demande
    -- n'a plus besoin de rester "non lue"
    -- ------------------------------------------------

    update public.notifications
    set lu_at = coalesce(
        lu_at,
        now()
    )
    where utilisateur_id =
              v_organisateur_id

      and demande_id =
              new.id

      and type =
              'demande_recue'

      and lu_at is null;


    -- ------------------------------------------------
    -- Notification destinée au demandeur
    -- ------------------------------------------------

    if new.statut = 'acceptee' then

        v_type_notification :=
            'demande_acceptee';

        v_titre_notification :=
            'Demande acceptée';

        v_contenu_notification :=
            'Votre demande de participation à « '
            || v_titre_sortie
            || ' » a été acceptée.';

    else

        v_type_notification :=
            'demande_refusee';

        v_titre_notification :=
            'Demande refusée';

        v_contenu_notification :=
            'Votre demande de participation à « '
            || v_titre_sortie
            || ' » a été refusée.';

    end if;


    insert into public.notifications (
        utilisateur_id,
        type,
        acteur_id,
        sortie_id,
        demande_id,
        titre,
        contenu,
        lien
    )
    values (
        new.utilisateur_id,
        v_type_notification,
        v_organisateur_id,
        new.sortie_id,
        new.id,
        v_titre_notification,
        v_contenu_notification,
        '/sorties/' ||
            new.sortie_id::text
    );


    return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.ouvrir_conversation_participant (
  p_sortie_id      uuid,
  p_utilisateur_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
    v_user_id uuid;
    v_conversation_id uuid;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    -- Vérifie que l'utilisateur connecté
    -- est bien l'organisateur de la sortie,
    -- que la sortie est toujours planifiée
    -- et qu'elle n'a pas encore commencé.
    if not exists (
        select 1
        from public.sorties s
        where s.id = p_sortie_id
          and s.organisateur_id = v_user_id
          and s.statut = 'planifiee'
          and s.date_heure_depart > now()
    ) then
        raise exception 'Sortie non autorisee pour cette conversation';
    end if;


    -- Impossible de se contacter soi-même.
    if p_utilisateur_id = v_user_id then
        raise exception 'Impossible de creer une conversation avec soi-meme';
    end if;


    -- La personne ciblée doit être
    -- réellement inscrite à la sortie.
    if not exists (
        select 1
        from public.participations p
        where p.sortie_id = p_sortie_id
          and p.utilisateur_id = p_utilisateur_id
    ) then
        raise exception 'Cet utilisateur ne participe pas a cette sortie';
    end if;


    -- Si une conversation existe déjà,
    -- on renvoie simplement son identifiant.
    select c.id
    into v_conversation_id
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id
      and c.utilisateur_id = p_utilisateur_id;


    if v_conversation_id is not null then
        return v_conversation_id;
    end if;


    -- Sinon on crée la conversation.
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

CREATE OR REPLACE FUNCTION public.ouvrir_conversation_sortie (
  p_sortie_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
    v_conversation_id uuid;
begin

    -- Cherche d'abord une conversation existante
    select c.id
    into v_conversation_id
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id
      and c.utilisateur_id = auth.uid();

    if v_conversation_id is not null then
        return v_conversation_id;
    end if;


    -- Sinon, crée la conversation
    insert into public.conversations_sortie (
        sortie_id,
        utilisateur_id
    )
    values (
        p_sortie_id,
        auth.uid()
    )
    returning id
    into v_conversation_id;


    return v_conversation_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.refuser_demande_participation (
  p_demande_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_statut text;
begin

  if auth.uid() is null then
    raise exception 'Utilisateur non authentifie';
  end if;

  select d.statut
  into v_statut
  from public.demandes_participation d
  join public.sorties s
    on s.id = d.sortie_id
  where d.id = p_demande_id
    and s.organisateur_id = auth.uid()
  for update of d;

  if not found then
    raise exception 'Demande introuvable ou non autorisee';
  end if;

  if v_statut <> 'en_attente' then
    raise exception 'Cette demande a deja ete traitee';
  end if;

  update public.demandes_participation
  set statut = 'refusee'
  where id = p_demande_id;

end;
$function$;

CREATE OR REPLACE FUNCTION public.sorties_dans_rayon (
  p_latitude  double precision,
  p_longitude double precision,
  p_rayon_km  double precision
)
  RETURNS TABLE (
    id                      uuid,
    titre                   text,
    organisateur_id         uuid,
    nombre_max_participants smallint,
    date_heure_depart       timestamp with time zone,
    lieu_depart             text,
    type_sortie             text,
    mode_inscription        text,
    type_entrainement       text,
    distance_km             numeric,
    denivele_positif_m      integer,
    duree_estimee_minutes   integer,
    distance_geo_km         double precision
  )
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  select
    s.id,
    s.titre,
    s.organisateur_id,
    s.nombre_max_participants,
    s.date_heure_depart,
    s.lieu_depart,
    s.type_sortie,
    s.mode_inscription,

    s.type_entrainement,
    s.distance_km,
    s.denivele_positif_m,
    s.duree_estimee_minutes,

    extensions.st_distance(
      s.position_depart,
      extensions.st_setsrid(
        extensions.st_makepoint(
          p_longitude,
          p_latitude
        ),
        4326
      )::extensions.geography
    ) / 1000.0 as distance_geo_km

  from public.sorties s

  where
    s.position_depart is not null

    and s.statut = 'planifiee'

    and extensions.st_dwithin(
      s.position_depart,
      extensions.st_setsrid(
        extensions.st_makepoint(
          p_longitude,
          p_latitude
        ),
        4326
      )::extensions.geography,
      p_rayon_km * 1000
    )

  order by
    s.date_heure_depart asc;
$function$;

CREATE OR REPLACE FUNCTION public.supprimer_sortie_sans_interaction (
  p_sortie_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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


    -- Récupère et verrouille la sortie
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


    -- Seul l'organisateur peut supprimer
    if v_organisateur_id <> v_user_id then
        raise exception 'Vous ne pouvez pas supprimer cette sortie';
    end if;


    -- Une sortie annulée ne peut pas être supprimée
    if v_statut <> 'planifiee' then
        raise exception 'Cette sortie ne peut plus etre supprimee';
    end if;


    -- Une sortie passée ne peut pas être supprimée
    if v_date_heure_depart <= now() then
        raise exception 'Une sortie passee ne peut pas etre supprimee';
    end if;


    -- Participation existante
    if exists (
        select 1
        from public.participations p
        where p.sortie_id = p_sortie_id
    ) then
        raise exception 'Cette sortie possede deja des participants';
    end if;


    -- Demande existante, même refusée/annulée
    if exists (
        select 1
        from public.demandes_participation d
        where d.sortie_id = p_sortie_id
    ) then
        raise exception 'Cette sortie possede deja des demandes de participation';
    end if;


    -- NOUVEAU :
    -- Conversation existante, même sans message
    if exists (
        select 1
        from public.conversations_sortie c
        where c.sortie_id = p_sortie_id
    ) then
        raise exception 'Cette sortie possede deja une conversation';
    end if;


    delete from public.sorties
    where id = p_sortie_id;

end;
$function$;

REVOKE ALL ON public.conversations_sortie FROM anon;

REVOKE DELETE, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.conversations_sortie FROM authenticated;

REVOKE ALL ON public.messages FROM anon;

REVOKE DELETE, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON public.messages FROM authenticated;

REVOKE ALL ON public.notifications FROM anon;

REVOKE DELETE, INSERT, UPDATE ON public.notifications FROM authenticated;

CREATE TRIGGER trigger_notifications_email_vault
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.envoyer_notification_email_vault();

REVOKE DELETE ON public.sorties FROM authenticated;
