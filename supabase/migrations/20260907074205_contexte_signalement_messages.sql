-- ============================================================
-- CONTEXTE DES SIGNALEMENTS DE MESSAGES
--
-- On conserve :
-- - le message signalé
-- - jusqu'à 10 messages immédiatement précédents
--
-- Aucun accès général aux conversations n'est donné
-- aux modérateurs.
-- ============================================================


alter table public.signalements
add column if not exists message_contexte_snapshot jsonb;


-- ============================================================
-- CREATION D'UN SIGNALEMENT DE MESSAGE
-- ============================================================

create or replace function public.creer_signalement_message(
    p_message_id uuid,
    p_motif text,
    p_commentaire text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_utilisateur_id uuid;

    v_conversation_id uuid;
    v_expediteur_id uuid;
    v_contenu text;
    v_date_message timestamptz;
    v_auteur_nom text;

    v_commentaire text;
    v_signalement_id uuid;

    v_contexte jsonb;
begin

    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    v_utilisateur_id := auth.uid();

    if v_utilisateur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- MOTIF
    -- --------------------------------------------------------

    if p_motif is null
       or p_motif not in (
            'spam',
            'harcelement',
            'contenu_inapproprie',
            'faux_profil',
            'comportement_dangereux',
            'autre'
       )
    then
        raise exception 'MOTIF_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- COMMENTAIRE
    -- --------------------------------------------------------

    v_commentaire :=
        nullif(
            btrim(p_commentaire),
            ''
        );

    if v_commentaire is not null
       and (
            char_length(v_commentaire) < 3
            or char_length(v_commentaire) > 1000
       )
    then
        raise exception 'COMMENTAIRE_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- MESSAGE CIBLE
    --
    -- Le message doit :
    -- - exister ;
    -- - appartenir à une conversation de l'utilisateur ;
    -- - avoir été envoyé par l'autre personne.
    -- --------------------------------------------------------

    select
        m.conversation_id,
        m.expediteur_id,
        m.contenu,
        m.created_at,
        coalesce(p.nom, 'Utilisateur')

    into
        v_conversation_id,
        v_expediteur_id,
        v_contenu,
        v_date_message,
        v_auteur_nom

    from public.messages m

    join public.conversations_sortie c
        on c.id = m.conversation_id

    join public.sorties s
        on s.id = c.sortie_id

    left join public.profiles p
        on p.id = m.expediteur_id

    where
        m.id = p_message_id

        and m.expediteur_id <> v_utilisateur_id

        and (
            c.utilisateur_id = v_utilisateur_id
            or s.organisateur_id = v_utilisateur_id
        )

    limit 1;


    if v_expediteur_id is null then
        raise exception 'MESSAGE_NON_SIGNALABLE';
    end if;


    -- --------------------------------------------------------
    -- DOUBLON
    -- --------------------------------------------------------

    if exists (
        select 1

        from public.signalements sg

        where
            sg.signaleur_id = v_utilisateur_id
            and sg.type_cible = 'message'
            and sg.cible_id = p_message_id
            and sg.statut in (
                'ouvert',
                'en_cours'
            )
    )
    then
        raise exception 'SIGNALEMENT_DEJA_EXISTANT';
    end if;


    -- --------------------------------------------------------
    -- RATE LIMIT
    -- --------------------------------------------------------

    if (
        select count(*)

        from public.signalements sg

        where
            sg.signaleur_id = v_utilisateur_id
            and sg.created_at >= now() - interval '24 hours'
    ) >= 10
    then
        raise exception 'TROP_DE_SIGNALEMENTS';
    end if;


    -- --------------------------------------------------------
    -- CONTEXTE
    --
    -- Maximum :
    -- 10 messages précédents + message signalé.
    --
    -- L'ordre final est chronologique.
    -- --------------------------------------------------------

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'message_id',
                    contexte.id,

                    'auteur_id',
                    contexte.expediteur_id,

                    'auteur_nom',
                    contexte.auteur_nom,

                    'contenu',
                    contexte.contenu,

                    'created_at',
                    contexte.created_at,

                    'est_message_signale',
                    contexte.id = p_message_id
                )
                order by
                    contexte.created_at asc,
                    contexte.id asc
            ),
            '[]'::jsonb
        )

    into v_contexte

    from (

        select
            base.id,
            base.expediteur_id,
            base.contenu,
            base.created_at,
            coalesce(p.nom, 'Utilisateur') as auteur_nom

        from (

            select
                m.id,
                m.expediteur_id,
                m.contenu,
                m.created_at

            from public.messages m

            where
                m.conversation_id = v_conversation_id

                and (
                    m.created_at < v_date_message

                    or (
                        m.created_at = v_date_message
                        and m.id <= p_message_id
                    )
                )

            order by
                m.created_at desc,
                m.id desc

            limit 11

        ) base

        left join public.profiles p
            on p.id = base.expediteur_id

    ) contexte;


    -- --------------------------------------------------------
    -- INSERTION
    -- --------------------------------------------------------

    insert into public.signalements (
        signaleur_id,
        type_cible,
        cible_id,
        cible_libelle,
        cible_utilisateur_id,

        motif,
        commentaire,
        statut,

        message_contenu_snapshot,
        message_auteur_nom_snapshot,
        message_date_snapshot,

        message_contexte_snapshot
    )
    values (
        v_utilisateur_id,
        'message',
        p_message_id,
        'Message de ' || v_auteur_nom,
        v_expediteur_id,

        p_motif,
        v_commentaire,
        'ouvert',

        v_contenu,
        v_auteur_nom,
        v_date_message,

        v_contexte
    )

    returning id
    into v_signalement_id;


    return v_signalement_id;

end;
$$;


revoke all
on function public.creer_signalement_message(
    uuid,
    text,
    text
)
from public, anon;

grant execute
on function public.creer_signalement_message(
    uuid,
    text,
    text
)
to authenticated;


-- ============================================================
-- LECTURE ADMIN DU CONTEXTE
-- ============================================================

create or replace function public.admin_contexte_message_signalement(
    p_signalement_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_contexte jsonb;
begin

    if auth.uid() is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2'
    then
        raise exception 'MFA_REQUIS';
    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    select
        sg.message_contexte_snapshot

    into v_contexte

    from public.signalements sg

    where
        sg.id = p_signalement_id
        and sg.type_cible = 'message';


    return coalesce(
        v_contexte,
        '[]'::jsonb
    );

end;
$$;


revoke all
on function public.admin_contexte_message_signalement(uuid)
from public, anon;

grant execute
on function public.admin_contexte_message_signalement(uuid)
to authenticated;


notify pgrst, 'reload schema';