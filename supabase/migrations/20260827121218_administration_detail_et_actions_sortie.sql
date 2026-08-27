-- ============================================================
-- LIEN SORTIE DANS LE JOURNAL ADMINISTRATIF
-- ============================================================

alter table public.journal_administration
add column if not exists sortie_id uuid null
references public.sorties(id)
on delete set null;


create index if not exists
    journal_administration_sortie_idx
on public.journal_administration (
    sortie_id,
    created_at desc
);


-- ============================================================
-- DÉTAIL ADMINISTRATIF D'UNE SORTIE
-- ============================================================

create or replace function public.admin_detail_sortie(
    p_sortie_id uuid
)
returns table (
    sortie_id uuid,
    titre text,

    organisateur_id uuid,
    organisateur_nom text,
    organisateur_email text,

    date_heure_depart timestamptz,
    lieu_depart text,

    type_sortie text,
    mode_inscription text,
    type_entrainement text,

    distance_km numeric,
    denivele_positif_m integer,
    duree_estimee_minutes integer,
    intensite text,
    allure_secondes_km integer,

    description text,
    statut text,

    nombre_max_participants smallint,
    nombre_participants bigint,
    nombre_demandes bigint,
    nombre_conversations bigint,
    nombre_messages bigint,

    date_creation timestamptz
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


    if not exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = auth.uid()
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    return query

    select
        s.id,
        s.titre,

        s.organisateur_id,
        p.nom,
        u.email::text,

        s.date_heure_depart,
        s.lieu_depart,

        s.type_sortie,
        s.mode_inscription,
        s.type_entrainement,

        s.distance_km,
        s.denivele_positif_m,
        s.duree_estimee_minutes,
        s.intensite,
        s.allure_secondes_km,

        s.description,
        s.statut,

        s.nombre_max_participants,

        (
            1 +
            (
                select count(*)
                from public.participations pa
                where pa.sortie_id = s.id
            )
        )::bigint,

        (
            select count(*)::bigint
            from public.demandes_participation d
            where d.sortie_id = s.id
        ),

        (
            select count(*)::bigint
            from public.conversations_sortie c
            where c.sortie_id = s.id
        ),

        (
            select count(*)::bigint
            from public.messages m
            join public.conversations_sortie c
                on c.id = m.conversation_id
            where c.sortie_id = s.id
        ),

        s.created_at

    from public.sorties s

    join public.profiles p
        on p.id = s.organisateur_id

    join auth.users u
        on u.id = s.organisateur_id

    where
        s.id = p_sortie_id;

end;
$$;


revoke all
on function public.admin_detail_sortie(uuid)
from public;

revoke all
on function public.admin_detail_sortie(uuid)
from anon;

grant execute
on function public.admin_detail_sortie(uuid)
to authenticated;


-- ============================================================
-- ANNULATION ADMINISTRATIVE
-- ============================================================

create or replace function public.admin_annuler_sortie(
    p_sortie_id uuid,
    p_motif text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid;
    v_motif text;

    v_titre text;
    v_organisateur_id uuid;
    v_organisateur_nom text;
    v_date_depart timestamptz;
    v_statut text;
begin

    v_admin_id := auth.uid();


    if v_admin_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    if not exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = v_admin_id
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if char_length(v_motif) < 3
       or char_length(v_motif) > 1000 then
        raise exception 'MOTIF_INVALIDE';
    end if;


    select
        s.titre,
        s.organisateur_id,
        p.nom,
        s.date_heure_depart,
        s.statut

    into
        v_titre,
        v_organisateur_id,
        v_organisateur_nom,
        v_date_depart,
        v_statut

    from public.sorties s

    join public.profiles p
        on p.id = s.organisateur_id

    where
        s.id = p_sortie_id

    for update of s;


    if v_titre is null then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    if v_statut = 'annulee' then
        raise exception 'SORTIE_DEJA_ANNULEE';
    end if;


    if v_date_depart <= now() then
        raise exception 'SORTIE_PASSEE';
    end if;


    update public.sorties s
    set
        statut = 'annulee'
    where
        s.id = p_sortie_id;


    insert into public.journal_administration (
        acteur_id,
        action,
        utilisateur_cible_id,
        sortie_id,
        details
    )
    values (
        v_admin_id,
        'annulation_sortie_administrative',
        v_organisateur_id,
        p_sortie_id,

        jsonb_build_object(
            'sortie_id',
            p_sortie_id,
            'titre',
            v_titre,
            'organisateur_id',
            v_organisateur_id,
            'organisateur_nom',
            v_organisateur_nom,
            'date_depart',
            v_date_depart,
            'motif',
            v_motif
        )
    );


    return true;

end;
$$;


revoke all
on function public.admin_annuler_sortie(uuid, text)
from public;

revoke all
on function public.admin_annuler_sortie(uuid, text)
from anon;

grant execute
on function public.admin_annuler_sortie(uuid, text)
to authenticated;


-- ============================================================
-- SUPPRESSION ADMINISTRATIVE DÉFINITIVE
-- ============================================================

create or replace function public.admin_supprimer_sortie(
    p_sortie_id uuid,
    p_motif text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_admin_id uuid;
    v_motif text;

    v_titre text;
    v_organisateur_id uuid;
    v_organisateur_nom text;
    v_date_depart timestamptz;
    v_statut text;

    v_nombre_participations bigint;
    v_nombre_demandes bigint;
    v_nombre_conversations bigint;
    v_nombre_messages bigint;
begin

    v_admin_id := auth.uid();


    if v_admin_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;


    if not exists (
        select 1
        from public.roles_utilisateurs r
        where
            r.utilisateur_id = v_admin_id
            and r.role = 'administrateur'
    ) then
        raise exception 'ACCES_ADMIN_REFUSE';
    end if;


    v_motif :=
        trim(
            coalesce(
                p_motif,
                ''
            )
        );


    if char_length(v_motif) < 3
       or char_length(v_motif) > 1000 then
        raise exception 'MOTIF_INVALIDE';
    end if;


    select
        s.titre,
        s.organisateur_id,
        p.nom,
        s.date_heure_depart,
        s.statut

    into
        v_titre,
        v_organisateur_id,
        v_organisateur_nom,
        v_date_depart,
        v_statut

    from public.sorties s

    join public.profiles p
        on p.id = s.organisateur_id

    where
        s.id = p_sortie_id

    for update of s;


    if v_titre is null then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    select count(*)::bigint
    into v_nombre_participations
    from public.participations p
    where p.sortie_id = p_sortie_id;


    select count(*)::bigint
    into v_nombre_demandes
    from public.demandes_participation d
    where d.sortie_id = p_sortie_id;


    select count(*)::bigint
    into v_nombre_conversations
    from public.conversations_sortie c
    where c.sortie_id = p_sortie_id;


    select count(*)::bigint
    into v_nombre_messages
    from public.messages m
    join public.conversations_sortie c
        on c.id = m.conversation_id
    where
        c.sortie_id = p_sortie_id;


    -- On enregistre le maximum d'informations AVANT
    -- de supprimer la sortie.
    insert into public.journal_administration (
        acteur_id,
        action,
        utilisateur_cible_id,
        sortie_id,
        details
    )
    values (
        v_admin_id,
        'suppression_sortie_administrative',
        v_organisateur_id,
        p_sortie_id,

        jsonb_build_object(
            'sortie_id',
            p_sortie_id,
            'titre',
            v_titre,
            'organisateur_id',
            v_organisateur_id,
            'organisateur_nom',
            v_organisateur_nom,
            'date_depart',
            v_date_depart,
            'statut',
            v_statut,
            'participations',
            v_nombre_participations,
            'demandes',
            v_nombre_demandes,
            'conversations',
            v_nombre_conversations,
            'messages',
            v_nombre_messages,
            'motif',
            v_motif
        )
    );


    delete from public.sorties s
    where
        s.id = p_sortie_id;


    return true;

end;
$$;


revoke all
on function public.admin_supprimer_sortie(uuid, text)
from public;

revoke all
on function public.admin_supprimer_sortie(uuid, text)
from anon;

grant execute
on function public.admin_supprimer_sortie(uuid, text)
to authenticated;