-- ============================================================
-- SIGNALEMENT DES MESSAGES PRIVES
-- ============================================================
--
-- Un utilisateur peut uniquement signaler un message reçu
-- dans une conversation à laquelle il appartient.
--
-- Un instantané du message est conservé au moment du
-- signalement afin de préserver la preuve de modération.
-- ============================================================


-- ------------------------------------------------------------
-- 1. AUTORISER LE TYPE "message"
-- ------------------------------------------------------------

alter table public.signalements
drop constraint if exists signalements_type_cible_check;

alter table public.signalements
add constraint signalements_type_cible_check
check (
    type_cible in (
        'profil',
        'sortie',
        'message'
    )
);


-- ------------------------------------------------------------
-- 2. INSTANTANE DU MESSAGE
-- ------------------------------------------------------------

alter table public.signalements
add column if not exists message_contenu_snapshot text;

alter table public.signalements
add column if not exists message_auteur_nom_snapshot text;

alter table public.signalements
add column if not exists message_date_snapshot timestamptz;


-- ------------------------------------------------------------
-- 3. CREATION D'UN SIGNALEMENT DE MESSAGE
-- ------------------------------------------------------------

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

    v_expediteur_id uuid;

    v_contenu text;

    v_date_message timestamptz;

    v_auteur_nom text;

    v_commentaire text;

    v_signalement_id uuid;

begin

    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    v_utilisateur_id := auth.uid();

    if v_utilisateur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- VALIDATION DU MOTIF
    -- --------------------------------------------------------

    if p_motif not in (
        'spam',
        'harcelement',
        'contenu_inapproprie',
        'faux_profil',
        'comportement_dangereux',
        'autre'
    ) then
        raise exception 'MOTIF_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- VALIDATION DU COMMENTAIRE
    -- --------------------------------------------------------

    v_commentaire :=
        nullif(
            btrim(p_commentaire),
            ''
        );

    if
        v_commentaire is not null
        and (
            char_length(v_commentaire) < 3
            or char_length(v_commentaire) > 1000
        )
    then
        raise exception 'COMMENTAIRE_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- LECTURE DU MESSAGE
    --
    -- Le message doit :
    -- - exister ;
    -- - appartenir à une conversation de l'utilisateur ;
    -- - avoir été envoyé par l'autre personne.
    -- --------------------------------------------------------

    select
        m.expediteur_id,
        m.contenu,
        m.created_at,
        coalesce(
            p.nom,
            'Utilisateur'
        )

    into
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

    ) then

        raise exception
            'SIGNALEMENT_DEJA_EXISTANT';

    end if;


    -- --------------------------------------------------------
    -- ANTI-SPAM
    -- Maximum 10 signalements sur 24 heures.
    -- --------------------------------------------------------

    if (

        select count(*)

        from public.signalements sg

        where
            sg.signaleur_id = v_utilisateur_id

            and sg.created_at >=
                now() - interval '24 hours'

    ) >= 10 then

        raise exception
            'TROP_DE_SIGNALEMENTS';

    end if;


    -- --------------------------------------------------------
    -- CREATION
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
        message_date_snapshot
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
        v_date_message
    )
    returning id
    into v_signalement_id;


    return v_signalement_id;

end;
$$;


-- ------------------------------------------------------------
-- 4. DETAIL MESSAGE POUR LA MODERATION
-- ------------------------------------------------------------

create or replace function public.admin_detail_message_signalement(
    p_signalement_id uuid
)
returns table (
    signalement_id uuid,
    contenu_snapshot text,
    auteur_nom_snapshot text,
    date_message_snapshot timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    if auth.uid() is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    return query

    select
        sg.id,
        sg.message_contenu_snapshot,
        sg.message_auteur_nom_snapshot,
        sg.message_date_snapshot

    from public.signalements sg

    where
        sg.id = p_signalement_id
        and sg.type_cible = 'message';

end;
$$;


-- ------------------------------------------------------------
-- 5. PERMISSIONS
-- ------------------------------------------------------------

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


revoke all
on function public.admin_detail_message_signalement(uuid)
from public, anon;

grant execute
on function public.admin_detail_message_signalement(uuid)
to authenticated;


notify pgrst, 'reload schema';
