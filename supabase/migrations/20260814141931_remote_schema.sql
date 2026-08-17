-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE EXTENSION postgis WITH SCHEMA extensions;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.accepter_demande_participation (
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

REVOKE ALL ON FUNCTION public.accepter_demande_participation(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.accepter_demande_participation(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.accepter_demande_participation(uuid) TO service_role;

CREATE FUNCTION public.annuler_sortie (
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

REVOKE ALL ON FUNCTION public.annuler_sortie(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.annuler_sortie(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.annuler_sortie(uuid) TO service_role;

CREATE FUNCTION public.marquer_messages_comme_lus (
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

REVOKE ALL ON FUNCTION public.marquer_messages_comme_lus(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.marquer_messages_comme_lus(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.marquer_messages_comme_lus(uuid) TO service_role;

CREATE FUNCTION public.marquer_notification_lue (
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

REVOKE ALL ON FUNCTION public.marquer_notification_lue(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.marquer_notification_lue(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.marquer_notification_lue(uuid) TO service_role;

CREATE FUNCTION public.marquer_toutes_notifications_lues()
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

REVOKE ALL ON FUNCTION public.marquer_toutes_notifications_lues() FROM PUBLIC;

GRANT ALL ON FUNCTION public.marquer_toutes_notifications_lues() TO authenticated;

GRANT ALL ON FUNCTION public.marquer_toutes_notifications_lues() TO service_role;

CREATE FUNCTION public.mon_filtre_geographique()
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

GRANT ALL ON FUNCTION public.mon_filtre_geographique() TO anon;

GRANT ALL ON FUNCTION public.mon_filtre_geographique() TO authenticated;

GRANT ALL ON FUNCTION public.mon_filtre_geographique() TO service_role;

CREATE FUNCTION public.nombre_messages_non_lus()
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

REVOKE ALL ON FUNCTION public.nombre_messages_non_lus() FROM PUBLIC;

GRANT ALL ON FUNCTION public.nombre_messages_non_lus() TO authenticated;

GRANT ALL ON FUNCTION public.nombre_messages_non_lus() TO service_role;

CREATE FUNCTION public.nombre_notifications_non_lues()
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

REVOKE ALL ON FUNCTION public.nombre_notifications_non_lues() FROM PUBLIC;

GRANT ALL ON FUNCTION public.nombre_notifications_non_lues() TO authenticated;

GRANT ALL ON FUNCTION public.nombre_notifications_non_lues() TO service_role;

CREATE FUNCTION public.notifier_annulation_demande()
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

REVOKE ALL ON FUNCTION public.notifier_annulation_demande() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_annulation_demande() TO service_role;

CREATE FUNCTION public.notifier_changement_sortie()
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

REVOKE ALL ON FUNCTION public.notifier_changement_sortie() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_changement_sortie() TO service_role;

CREATE FUNCTION public.notifier_desinscription_participant()
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

REVOKE ALL ON FUNCTION public.notifier_desinscription_participant() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_desinscription_participant() TO service_role;

CREATE FUNCTION public.notifier_nouvelle_demande_participation()
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

REVOKE ALL ON FUNCTION public.notifier_nouvelle_demande_participation() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_nouvelle_demande_participation() TO service_role;

CREATE FUNCTION public.notifier_participation_automatique()
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

REVOKE ALL ON FUNCTION public.notifier_participation_automatique() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_participation_automatique() TO service_role;

CREATE FUNCTION public.notifier_traitement_demande_participation()
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

REVOKE ALL ON FUNCTION public.notifier_traitement_demande_participation() FROM PUBLIC;

GRANT ALL ON FUNCTION public.notifier_traitement_demande_participation() TO service_role;

CREATE FUNCTION public.ouvrir_conversation_participant (
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

REVOKE ALL ON FUNCTION public.ouvrir_conversation_participant(uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.ouvrir_conversation_participant(uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public.ouvrir_conversation_participant(uuid, uuid) TO service_role;

CREATE FUNCTION public.ouvrir_conversation_sortie (
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

REVOKE ALL ON FUNCTION public.ouvrir_conversation_sortie(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.ouvrir_conversation_sortie(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.ouvrir_conversation_sortie(uuid) TO service_role;

CREATE FUNCTION public.refuser_demande_participation (
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

REVOKE ALL ON FUNCTION public.refuser_demande_participation(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.refuser_demande_participation(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.refuser_demande_participation(uuid) TO service_role;

CREATE FUNCTION public.sorties_dans_rayon (
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

GRANT ALL ON FUNCTION public.sorties_dans_rayon(double precision, double precision, double precision) TO anon;

GRANT ALL ON FUNCTION public.sorties_dans_rayon(double precision, double precision, double precision) TO authenticated;

GRANT ALL ON FUNCTION public.sorties_dans_rayon(double precision, double precision, double precision) TO service_role;

CREATE FUNCTION public.supprimer_sortie_sans_interaction (
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

REVOKE ALL ON FUNCTION public.supprimer_sortie_sans_interaction(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.supprimer_sortie_sans_interaction(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.supprimer_sortie_sans_interaction(uuid) TO service_role;

CREATE TABLE public.conversations_sortie (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  sortie_id      uuid                     NOT NULL,
  utilisateur_id uuid                     NOT NULL,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.conversations_sortie
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations_sortie
  ADD CONSTRAINT conversations_sortie_pkey PRIMARY KEY (id);

ALTER TABLE public.conversations_sortie
  ADD CONSTRAINT conversations_sortie_unique UNIQUE (sortie_id, utilisateur_id);

GRANT INSERT, SELECT ON public.conversations_sortie TO authenticated;

GRANT ALL ON public.conversations_sortie TO service_role;

CREATE INDEX conversations_sortie_utilisateur_idx ON public.conversations_sortie (utilisateur_id);

CREATE TABLE public.demandes_participation (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  sortie_id      uuid                     NOT NULL,
  utilisateur_id uuid                     NOT NULL,
  statut         text                     DEFAULT 'en_attente'::text NOT NULL,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.demandes_participation
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.demandes_participation
  ADD CONSTRAINT demandes_participation_pkey PRIMARY KEY (id);

ALTER TABLE public.demandes_participation
  ADD CONSTRAINT demandes_participation_statut_check CHECK (statut = ANY (ARRAY['en_attente'::text, 'acceptee'::text, 'refusee'::text, 'annulee'::text]));

GRANT ALL ON public.demandes_participation TO anon;

GRANT ALL ON public.demandes_participation TO authenticated;

GRANT ALL ON public.demandes_participation TO service_role;

CREATE UNIQUE INDEX demandes_participation_unique_en_attente ON public.demandes_participation (sortie_id, utilisateur_id)
  WHERE statut = 'en_attente'::text;

CREATE TRIGGER trigger_notification_annulation_demande
  AFTER UPDATE OF statut ON public.demandes_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_annulation_demande();

CREATE TRIGGER trigger_notification_nouvelle_demande
  AFTER INSERT ON public.demandes_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_nouvelle_demande_participation();

CREATE TRIGGER trigger_notification_traitement_demande
  AFTER UPDATE OF statut ON public.demandes_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_traitement_demande_participation();

CREATE POLICY demandes_delete_own_pending ON public.demandes_participation
  FOR DELETE
  TO authenticated
  USING (((utilisateur_id = auth.uid()) AND (statut = 'en_attente'::text)));

CREATE TABLE public.messages (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid                     NOT NULL,
  expediteur_id   uuid                     NOT NULL,
  contenu         text                     NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  lu_at           timestamp with time zone
);

ALTER TABLE public.messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_contenu_check CHECK (char_length(btrim(contenu)) >= 1 AND char_length(btrim(contenu)) <= 2000);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations_sortie(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

GRANT INSERT, SELECT ON public.messages TO authenticated;

GRANT ALL ON public.messages TO service_role;

CREATE INDEX messages_expediteur_idx ON public.messages (expediteur_id);

CREATE INDEX messages_conversation_date_idx ON public.messages (conversation_id, created_at);

CREATE TABLE public.notifications (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  utilisateur_id uuid                     NOT NULL,
  type           text                     NOT NULL,
  acteur_id      uuid,
  sortie_id      uuid,
  demande_id     uuid,
  titre          text                     NOT NULL,
  contenu        text,
  lien           text,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  lu_at          timestamp with time zone
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, TABLE public.notifications;

ALTER TABLE public.notifications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES public.demandes_participation(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
    CHECK
    (type = ANY (ARRAY['demande_recue'::text, 'demande_acceptee'::text, 'demande_refusee'::text, 'demande_annulee'::text, 'participation_automatique'::text,
    'participant_desinscrit'::text, 'sortie_annulee'::text, 'sortie_modifiee'::text]));

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.notifications TO authenticated;

GRANT ALL ON public.notifications TO service_role;

CREATE INDEX notifications_non_lues_idx ON public.notifications (utilisateur_id, created_at DESC)
  WHERE lu_at IS NULL;

CREATE INDEX notifications_utilisateur_date_idx ON public.notifications (utilisateur_id, created_at DESC);

CREATE POLICY notifications_lecture_propre ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = utilisateur_id));

CREATE TABLE public.participations (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  sortie_id      uuid                     NOT NULL,
  utilisateur_id uuid                     NOT NULL,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.participations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.participations
  ADD CONSTRAINT participations_pkey PRIMARY KEY (id);

ALTER TABLE public.participations
  ADD CONSTRAINT participations_sortie_id_utilisateur_id_key UNIQUE (sortie_id, utilisateur_id);

GRANT ALL ON public.participations TO anon;

GRANT ALL ON public.participations TO authenticated;

GRANT ALL ON public.participations TO service_role;

CREATE TRIGGER trigger_notification_desinscription_participant
  AFTER DELETE ON public.participations
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_desinscription_participant();

CREATE TRIGGER trigger_notification_participation_automatique
  AFTER INSERT ON public.participations
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_participation_automatique();

CREATE POLICY participations_delete_own ON public.participations
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = utilisateur_id));

CREATE POLICY participations_insert_own ON public.participations
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = utilisateur_id));

CREATE POLICY participations_select_authenticated ON public.participations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.profiles (
  id                           uuid                             NOT NULL,
  nom                          text                             NOT NULL,
  age                          smallint                         NOT NULL,
  sexe                         text                             NOT NULL,
  created_at                   timestamp with time zone         DEFAULT now() NOT NULL,
  lieu_recherche               text,
  rayon_recherche_km           smallint                         DEFAULT 20 NOT NULL,
  position_recherche           extensions.geography(Point,4326),
  notifications_email_activees boolean                          DEFAULT false NOT NULL
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_check CHECK (age >= 16 AND age <= 100);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nom_check CHECK (char_length(TRIM(BOTH FROM nom)) >= 2 AND char_length(TRIM(BOTH FROM nom)) <= 50);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.conversations_sortie
  ADD CONSTRAINT conversations_sortie_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.demandes_participation
  ADD CONSTRAINT demandes_participation_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_expediteur_id_fkey FOREIGN KEY (expediteur_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_acteur_id_fkey FOREIGN KEY (acteur_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.participations
  ADD CONSTRAINT participations_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rayon_recherche_check CHECK (rayon_recherche_km = ANY (ARRAY[5, 10, 20, 30, 50, 100]));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sexe_check CHECK (sexe = ANY (ARRAY['homme'::text, 'femme'::text, 'autre'::text]));

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE TABLE public.sorties (
  id                      uuid                             DEFAULT gen_random_uuid() NOT NULL,
  titre                   text                             NOT NULL,
  organisateur_id         uuid                             NOT NULL,
  nombre_max_participants smallint                         NOT NULL,
  created_at              timestamp with time zone         DEFAULT now() NOT NULL,
  date_heure_depart       timestamp with time zone         NOT NULL,
  lieu_depart             text                             NOT NULL,
  type_sortie             text                             NOT NULL,
  position_depart         extensions.geography(Point,4326),
  mode_inscription        text                             DEFAULT 'automatique'::text NOT NULL,
  type_entrainement       text,
  distance_km             numeric(6,2),
  denivele_positif_m      integer,
  duree_estimee_minutes   integer,
  intensite               text,
  allure_secondes_km      integer,
  description             text,
  statut                  text                             DEFAULT 'planifiee'::text NOT NULL
);

CREATE POLICY conversation_visible_par_les_deux ON public.conversations_sortie
  FOR SELECT
  TO authenticated
  USING (((utilisateur_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = conversations_sortie.sortie_id) AND (s.organisateur_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY utilisateur_peut_creer_conversation ON public.conversations_sortie
  FOR INSERT
  TO authenticated
  WITH CHECK (((utilisateur_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = conversations_sortie.sortie_id) AND (s.organisateur_id <> ( SELECT auth.uid() AS uid)) AND (s.statut = 'planifiee'::text) AND (s.date_heure_depart > now()))))));

CREATE POLICY demandes_insert_own ON public.demandes_participation
  FOR INSERT
  TO authenticated
  WITH CHECK (((utilisateur_id = auth.uid()) AND (statut = 'en_attente'::text) AND (EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = demandes_participation.sortie_id) AND (s.mode_inscription = 'validation'::text) AND (s.organisateur_id <> auth.uid())))) AND (NOT (EXISTS ( SELECT 1
   FROM public.participations p
  WHERE ((p.sortie_id = demandes_participation.sortie_id) AND (p.utilisateur_id = auth.uid())))))));

CREATE POLICY demandes_select ON public.demandes_participation
  FOR SELECT
  TO authenticated
  USING (((utilisateur_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = demandes_participation.sortie_id) AND (s.organisateur_id = auth.uid()))))));

CREATE POLICY demandes_sortie_planifiee ON public.demandes_participation
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = demandes_participation.sortie_id) AND (s.statut = 'planifiee'::text)))));

CREATE POLICY demandes_update_organisateur ON public.demandes_participation
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = demandes_participation.sortie_id) AND (s.organisateur_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = demandes_participation.sortie_id) AND (s.organisateur_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY message_envoye_par_membre_conversation ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (((expediteur_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.conversations_sortie c
     JOIN public.sorties s ON ((s.id = c.sortie_id)))
  WHERE
    ((c.id = messages.conversation_id) AND ((c.utilisateur_id = ( SELECT auth.uid() AS uid)) OR (s.organisateur_id = ( SELECT auth.uid() AS uid))) AND (s.statut =
    'planifiee'::text) AND (now() <= ((s.date_heure_depart + make_interval(mins => COALESCE(s.duree_estimee_minutes, 0))) + '12:00:00'::interval)))))));

CREATE POLICY messages_visibles_par_les_deux ON public.messages
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.conversations_sortie c
     JOIN public.sorties s ON ((s.id = c.sortie_id)))
  WHERE ((c.id = messages.conversation_id) AND ((c.utilisateur_id = ( SELECT auth.uid() AS uid)) OR (s.organisateur_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY participations_insert_organisateur_validation ON public.participations
  FOR INSERT
  TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = participations.sortie_id) AND (s.organisateur_id = ( SELECT auth.uid() AS uid)) AND (s.mode_inscription = 'validation'::text)))) AND (EXISTS ( SELECT 1
   FROM public.demandes_participation d
  WHERE ((d.sortie_id = participations.sortie_id) AND (d.utilisateur_id = participations.utilisateur_id) AND (d.statut = 'en_attente'::text))))));

CREATE POLICY participations_sortie_planifiee ON public.participations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sorties s
  WHERE ((s.id = participations.sortie_id) AND (s.statut = 'planifiee'::text)))));

ALTER TABLE public.sorties
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_allure_check CHECK (allure_secondes_km IS NULL OR allure_secondes_km > 0);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_denivele_check CHECK (denivele_positif_m IS NULL OR denivele_positif_m >= 0);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_distance_positive_check CHECK (distance_km IS NULL OR distance_km > 0::numeric);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_duree_check CHECK (duree_estimee_minutes IS NULL OR duree_estimee_minutes > 0);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_intensite_check CHECK (intensite IS NULL OR (intensite = ANY (ARRAY['tranquille'::text, 'moderee'::text, 'soutenue'::text])));

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_mode_inscription_check CHECK (mode_inscription = ANY (ARRAY['automatique'::text, 'validation'::text]));

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_nombre_max_participants_check CHECK (nombre_max_participants >= 2 AND nombre_max_participants <= 100);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_organisateur_id_fkey FOREIGN KEY (organisateur_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_pkey PRIMARY KEY (id);

ALTER TABLE public.conversations_sortie
  ADD CONSTRAINT conversations_sortie_sortie_id_fkey FOREIGN KEY (sortie_id) REFERENCES public.sorties(id) ON DELETE RESTRICT;

ALTER TABLE public.demandes_participation
  ADD CONSTRAINT demandes_participation_sortie_id_fkey FOREIGN KEY (sortie_id) REFERENCES public.sorties(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_sortie_id_fkey FOREIGN KEY (sortie_id) REFERENCES public.sorties(id) ON DELETE SET NULL;

ALTER TABLE public.participations
  ADD CONSTRAINT participations_sortie_id_fkey FOREIGN KEY (sortie_id) REFERENCES public.sorties(id) ON DELETE CASCADE;

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_statut_check CHECK (statut = ANY (ARRAY['planifiee'::text, 'annulee'::text]));

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_titre_check CHECK (char_length(TRIM(BOTH FROM titre)) >= 3 AND char_length(TRIM(BOTH FROM titre)) <= 100);

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_type_entrainement_check
    CHECK
    (type_entrainement IS NULL OR (type_entrainement = ANY (ARRAY['endurance_fondamentale'::text, 'sortie_longue'::text, 'tempo_seuil'::text, 'fractionne'::text, 'cotes'::text,
    'recuperation'::text, 'libre'::text])));

ALTER TABLE public.sorties
  ADD CONSTRAINT sorties_type_sortie_check CHECK (type_sortie = ANY (ARRAY['route'::text, 'trail'::text]));

GRANT ALL ON public.sorties TO anon;

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.sorties TO authenticated;

GRANT ALL ON public.sorties TO service_role;

CREATE INDEX sorties_position_depart_idx ON public.sorties USING gist (position_depart);

CREATE TRIGGER trigger_notification_changement_sortie
  AFTER UPDATE ON public.sorties
  FOR EACH ROW
  EXECUTE FUNCTION public.notifier_changement_sortie();

CREATE POLICY sorties_delete_own ON public.sorties
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = organisateur_id));

CREATE POLICY sorties_insert_own ON public.sorties
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = organisateur_id));

CREATE POLICY sorties_select_authenticated ON public.sorties
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY sorties_update_own ON public.sorties
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = organisateur_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = organisateur_id));
