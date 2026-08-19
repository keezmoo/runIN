-- ============================================================
-- ANTI-SPAM MESSAGERIE
--
-- Maximum 5 messages en 10 secondes
-- dans une même conversation.
--
-- Au 6e message :
-- blocage pendant 1 minute.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Blocages temporaires
-- ------------------------------------------------------------

create table if not exists
runin_private.blocages_messagerie (

    conversation_id uuid not null
        references public.conversations_sortie(id)
        on delete cascade,

    utilisateur_id uuid not null
        references public.profiles(id)
        on delete cascade,

    bloque_jusqua timestamptz not null,

    updated_at timestamptz not null
        default now(),

    primary key (
        conversation_id,
        utilisateur_id
    )
);


revoke all
on runin_private.blocages_messagerie
from public, anon, authenticated;



-- ============================================================
-- 2. RPC D'ENVOI SECURISE
-- ============================================================

create or replace function public.envoyer_message_sortie(
    p_conversation_id uuid,
    p_contenu text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;

    v_sortie_id uuid;
    v_participant_id uuid;

    v_organisateur_id uuid;
    v_statut_sortie text;
    v_date_depart timestamptz;
    v_duree_minutes integer;

    v_date_cloture timestamptz;

    v_nombre_recent integer;
    v_bloque_jusqua timestamptz;

    v_contenu text;
begin

    v_user_id := auth.uid();


    -- --------------------------------------------------------
    -- Authentification
    -- --------------------------------------------------------

    if v_user_id is null then
        raise exception 'UTILISATEUR_NON_AUTHENTIFIE';
    end if;


    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    -- --------------------------------------------------------
    -- Contenu
    -- --------------------------------------------------------

    v_contenu := btrim(
        coalesce(
            p_contenu,
            ''
        )
    );


    if char_length(v_contenu) < 1 then
        raise exception 'MESSAGE_VIDE';
    end if;


    if char_length(v_contenu) > 2000 then
        raise exception 'MESSAGE_TROP_LONG';
    end if;


    -- --------------------------------------------------------
    -- Verrouille la conversation.
    --
    -- Cela évite que plusieurs requêtes simultanées
    -- contournent le compteur anti-spam.
    -- --------------------------------------------------------

    select
        c.sortie_id,
        c.utilisateur_id

    into
        v_sortie_id,
        v_participant_id

    from public.conversations_sortie c

    where c.id = p_conversation_id

    for update;


    if not found then
        raise exception 'CONVERSATION_INTROUVABLE';
    end if;


    -- --------------------------------------------------------
    -- Sortie associée
    -- --------------------------------------------------------

    select
        s.organisateur_id,
        s.statut,
        s.date_heure_depart,
        coalesce(
            s.duree_estimee_minutes,
            0
        )

    into
        v_organisateur_id,
        v_statut_sortie,
        v_date_depart,
        v_duree_minutes

    from public.sorties s

    where s.id = v_sortie_id;


    if not found then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    -- --------------------------------------------------------
    -- Appartenance à la conversation
    -- --------------------------------------------------------

    if
        v_user_id <> v_participant_id
        and
        v_user_id <> v_organisateur_id
    then

        raise exception 'CONVERSATION_NON_AUTORISEE';

    end if;


    -- --------------------------------------------------------
    -- Conversation encore ouverte ?
    --
    -- fermeture :
    -- fin estimée de la sortie + 12 heures
    -- --------------------------------------------------------

    if v_statut_sortie = 'annulee' then
        raise exception 'CONVERSATION_FERMEE';
    end if;


    v_date_cloture :=
        v_date_depart
        + (
            v_duree_minutes
            * interval '1 minute'
        )
        + interval '12 hours';


    if now() > v_date_cloture then
        raise exception 'CONVERSATION_FERMEE';
    end if;


    -- --------------------------------------------------------
    -- Blocage déjà actif ?
    -- --------------------------------------------------------

    select
        b.bloque_jusqua

    into
        v_bloque_jusqua

    from runin_private.blocages_messagerie b

    where
        b.conversation_id =
            p_conversation_id

        and
        b.utilisateur_id =
            v_user_id;


    if
        v_bloque_jusqua is not null
        and
        v_bloque_jusqua > now()
    then

        raise exception 'SPAM_MESSAGES';

    end if;


    -- --------------------------------------------------------
    -- Nombre de messages envoyés
    -- dans les 10 dernières secondes.
    -- --------------------------------------------------------

    select count(*)

    into v_nombre_recent

    from public.messages m

    where
        m.conversation_id =
            p_conversation_id

        and
        m.expediteur_id =
            v_user_id

        and
        m.created_at >=
            now() - interval '10 seconds';


    -- 5 sont autorisés.
    -- Le suivant déclenche le blocage.

    if v_nombre_recent >= 5 then

        insert into
        runin_private.blocages_messagerie (
            conversation_id,
            utilisateur_id,
            bloque_jusqua,
            updated_at
        )

        values (
            p_conversation_id,
            v_user_id,
            now() + interval '1 minute',
            now()
        )

        on conflict (
            conversation_id,
            utilisateur_id
        )

        do update
        set
            bloque_jusqua =
                now() + interval '1 minute',

            updated_at =
                now();


        raise exception 'SPAM_MESSAGES';

    end if;


    -- --------------------------------------------------------
    -- Message
    -- --------------------------------------------------------

    insert into public.messages (
        conversation_id,
        expediteur_id,
        contenu
    )

    values (
        p_conversation_id,
        v_user_id,
        v_contenu
    );

end;
$$;


revoke all
on function public.envoyer_message_sortie(
    uuid,
    text
)
from public, anon;


grant execute
on function public.envoyer_message_sortie(
    uuid,
    text
)
to authenticated;
