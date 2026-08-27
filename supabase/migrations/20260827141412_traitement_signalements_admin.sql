-- ============================================================
-- TRAITEMENT DES SIGNALEMENTS
-- ============================================================


-- ============================================================
-- 1. INFORMATIONS DE DECISION
-- ============================================================

alter table public.signalements
add column if not exists traite_par uuid null;


do $$
begin

    if not exists (
        select 1
        from pg_constraint c
        where
            c.conrelid =
                'public.signalements'::regclass

            and c.conname =
                'signalements_traite_par_fkey'
    ) then

        alter table public.signalements
        add constraint signalements_traite_par_fkey

        foreign key (
            traite_par
        )

        references public.profiles(id)

        on delete set null;

    end if;

end;
$$;


alter table public.signalements
add column if not exists decision_commentaire text null;


do $$
begin

    if not exists (
        select 1
        from pg_constraint c
        where
            c.conrelid =
                'public.signalements'::regclass

            and c.conname =
                'signalements_decision_commentaire_check'
    ) then

        alter table public.signalements
        add constraint
            signalements_decision_commentaire_check

        check (
            decision_commentaire is null

            or char_length(
                trim(
                    decision_commentaire
                )
            ) between 3 and 1000
        );

    end if;

end;
$$;


-- ============================================================
-- 2. LIEN VERS LE SIGNALEMENT DANS LE JOURNAL
-- ============================================================

alter table public.journal_administration
add column if not exists signalement_id uuid null;


do $$
begin

    if not exists (
        select 1
        from pg_constraint c
        where
            c.conrelid =
                'public.journal_administration'::regclass

            and c.conname =
                'journal_administration_signalement_id_fkey'
    ) then

        alter table public.journal_administration
        add constraint
            journal_administration_signalement_id_fkey

        foreign key (
            signalement_id
        )

        references public.signalements(id)

        on delete set null;

    end if;

end;
$$;


create index if not exists
    journal_administration_signalement_idx
on public.journal_administration (
    signalement_id,
    created_at desc
);


-- ============================================================
-- 3. DETAIL D'UN SIGNALEMENT
-- ============================================================

create or replace function public.admin_detail_signalement(
    p_signalement_id uuid
)
returns table (
    signalement_id uuid,

    type_cible text,
    cible_id uuid,
    cible_libelle text,

    cible_utilisateur_id uuid,
    cible_utilisateur_nom text,
    cible_utilisateur_email text,
    cible_utilisateur_role text,

    cible_profil_existe boolean,
    cible_sortie_existe boolean,

    signaleur_id uuid,
    signaleur_nom text,
    signaleur_email text,

    motif text,
    commentaire text,

    statut text,

    assigne_a uuid,
    assigne_nom text,

    date_signalement timestamptz,
    date_mise_a_jour timestamptz,

    traite_at timestamptz,

    traite_par uuid,
    traite_par_nom text,

    decision_commentaire text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

    -- --------------------------------------------------------
    -- SECURITE
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception
            'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then

        raise exception
            'MFA_REQUIS';

    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    -- --------------------------------------------------------
    -- DETAIL
    -- --------------------------------------------------------

    return query

    select
        s.id,

        s.type_cible,
        s.cible_id,
        s.cible_libelle,

        s.cible_utilisateur_id,

        pc.nom,

        uc.email::text,

        coalesce(
            rc.role,
            'utilisateur'
        ),

        (
            s.type_cible = 'profil'
            and pc.id is not null
        ),

        (
            s.type_cible = 'sortie'
            and so.id is not null
        ),

        s.signaleur_id,

        ps.nom,

        us.email::text,

        s.motif,
        s.commentaire,

        s.statut,

        s.assigne_a,
        pa.nom,

        s.created_at,
        s.updated_at,

        s.traite_at,

        s.traite_par,
        pt.nom,

        s.decision_commentaire

    from public.signalements s


    left join public.profiles pc
        on pc.id =
            s.cible_utilisateur_id


    left join auth.users uc
        on uc.id =
            s.cible_utilisateur_id


    left join public.roles_utilisateurs rc
        on rc.utilisateur_id =
            s.cible_utilisateur_id


    left join public.sorties so
        on
            s.type_cible = 'sortie'
            and so.id = s.cible_id


    left join public.profiles ps
        on ps.id =
            s.signaleur_id


    left join auth.users us
        on us.id =
            s.signaleur_id


    left join public.profiles pa
        on pa.id =
            s.assigne_a


    left join public.profiles pt
        on pt.id =
            s.traite_par


    where
        s.id =
            p_signalement_id;

end;
$$;


revoke all
on function public.admin_detail_signalement(uuid)
from public;


revoke all
on function public.admin_detail_signalement(uuid)
from anon;


grant execute
on function public.admin_detail_signalement(uuid)
to authenticated;


-- ============================================================
-- 4. PRENDRE EN CHARGE
-- ============================================================

create or replace function public.admin_prendre_signalement(
    p_signalement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_acteur_id uuid;

    v_statut text;

    v_assigne_a uuid;

    v_type_cible text;

    v_cible_id uuid;

    v_cible_libelle text;
begin

    v_acteur_id :=
        auth.uid();


    -- --------------------------------------------------------
    -- SECURITE
    -- --------------------------------------------------------

    if v_acteur_id is null then
        raise exception
            'NON_AUTHENTIFIE';
    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then

        raise exception
            'MFA_REQUIS';

    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    -- --------------------------------------------------------
    -- VERROUILLAGE
    -- --------------------------------------------------------

    select
        s.statut,
        s.assigne_a,
        s.type_cible,
        s.cible_id,
        s.cible_libelle

    into
        v_statut,
        v_assigne_a,
        v_type_cible,
        v_cible_id,
        v_cible_libelle

    from public.signalements s

    where
        s.id =
            p_signalement_id

    for update;


    if not found then

        raise exception
            'SIGNALEMENT_INTROUVABLE';

    end if;


    -- --------------------------------------------------------
    -- DEJA CLOTURE
    -- --------------------------------------------------------

    if v_statut in (
        'traite',
        'rejete'
    ) then

        raise exception
            'SIGNALEMENT_DEJA_CLOTURE';

    end if;


    -- --------------------------------------------------------
    -- DEJA PRIS EN CHARGE
    -- --------------------------------------------------------

    if v_statut = 'en_cours' then

        if v_assigne_a =
           v_acteur_id then

            return true;

        end if;


        raise exception
            'SIGNALEMENT_DEJA_PRIS_EN_CHARGE';

    end if;


    -- --------------------------------------------------------
    -- PRISE EN CHARGE
    -- --------------------------------------------------------

    update public.signalements s

    set
        statut =
            'en_cours',

        assigne_a =
            v_acteur_id,

        updated_at =
            now()

    where
        s.id =
            p_signalement_id;


    -- --------------------------------------------------------
    -- JOURNAL
    -- --------------------------------------------------------

    insert into public.journal_administration (
        acteur_id,
        action,
        signalement_id,
        utilisateur_cible_id,
        details
    )
    values (
        v_acteur_id,

        'prise_en_charge_signalement',

        p_signalement_id,

        (
            select s.cible_utilisateur_id
            from public.signalements s
            where s.id = p_signalement_id
        ),

        jsonb_build_object(
            'signalement_id',
            p_signalement_id,

            'type_cible',
            v_type_cible,

            'cible_id',
            v_cible_id,

            'cible_libelle',
            v_cible_libelle
        )
    );


    return true;

end;
$$;


revoke all
on function public.admin_prendre_signalement(uuid)
from public;


revoke all
on function public.admin_prendre_signalement(uuid)
from anon;


grant execute
on function public.admin_prendre_signalement(uuid)
to authenticated;


-- ============================================================
-- 5. CLOTURER LE SIGNALEMENT
--
-- p_decision :
--     traite
--     rejete
-- ============================================================

create or replace function public.admin_clore_signalement(
    p_signalement_id uuid,
    p_decision text,
    p_commentaire text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_acteur_id uuid;

    v_statut text;

    v_assigne_a uuid;

    v_commentaire text;

    v_type_cible text;

    v_cible_id uuid;

    v_cible_libelle text;

    v_cible_utilisateur_id uuid;
begin

    v_acteur_id :=
        auth.uid();


    -- --------------------------------------------------------
    -- SECURITE
    -- --------------------------------------------------------

    if v_acteur_id is null then

        raise exception
            'NON_AUTHENTIFIE';

    end if;


    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then

        raise exception
            'MFA_REQUIS';

    end if;


    if not
        runin_private.est_moderateur_ou_administrateur()
    then

        raise exception
            'ACCES_ADMIN_REFUSE';

    end if;


    -- --------------------------------------------------------
    -- DECISION
    -- --------------------------------------------------------

    if p_decision not in (
        'traite',
        'rejete'
    ) then

        raise exception
            'DECISION_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- COMMENTAIRE
    -- --------------------------------------------------------

    v_commentaire :=
        trim(
            coalesce(
                p_commentaire,
                ''
            )
        );


    if
        char_length(v_commentaire) < 3
        or
        char_length(v_commentaire) > 1000
    then

        raise exception
            'COMMENTAIRE_DECISION_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- SIGNALEMENT
    -- --------------------------------------------------------

    select
        s.statut,
        s.assigne_a,

        s.type_cible,
        s.cible_id,
        s.cible_libelle,
        s.cible_utilisateur_id

    into
        v_statut,
        v_assigne_a,

        v_type_cible,
        v_cible_id,
        v_cible_libelle,
        v_cible_utilisateur_id

    from public.signalements s

    where
        s.id =
            p_signalement_id

    for update;


    if not found then

        raise exception
            'SIGNALEMENT_INTROUVABLE';

    end if;


    if v_statut in (
        'traite',
        'rejete'
    ) then

        raise exception
            'SIGNALEMENT_DEJA_CLOTURE';

    end if;


    -- Si un autre gestionnaire a officiellement pris
    -- le signalement, on évite deux décisions concurrentes.

    if
        v_statut = 'en_cours'

        and v_assigne_a is not null

        and v_assigne_a <>
            v_acteur_id
    then

        raise exception
            'SIGNALEMENT_PRIS_PAR_AUTRE';

    end if;


    -- --------------------------------------------------------
    -- CLOTURE
    -- --------------------------------------------------------

    update public.signalements s

    set
        statut =
            p_decision,

        assigne_a =
            coalesce(
                s.assigne_a,
                v_acteur_id
            ),

        traite_at =
            now(),

        traite_par =
            v_acteur_id,

        decision_commentaire =
            v_commentaire,

        updated_at =
            now()

    where
        s.id =
            p_signalement_id;


    -- --------------------------------------------------------
    -- JOURNAL
    -- --------------------------------------------------------

    insert into public.journal_administration (
        acteur_id,
        action,
        signalement_id,
        utilisateur_cible_id,
        details
    )
    values (
        v_acteur_id,

        case

            when p_decision = 'traite'
            then 'traitement_signalement'

            else 'rejet_signalement'

        end,

        p_signalement_id,

        v_cible_utilisateur_id,

        jsonb_build_object(
            'signalement_id',
            p_signalement_id,

            'type_cible',
            v_type_cible,

            'cible_id',
            v_cible_id,

            'cible_libelle',
            v_cible_libelle,

            'decision',
            p_decision,

            'commentaire',
            v_commentaire
        )
    );


    return true;

end;
$$;


revoke all
on function public.admin_clore_signalement(
    uuid,
    text,
    text
)
from public;


revoke all
on function public.admin_clore_signalement(
    uuid,
    text,
    text
)
from anon;


grant execute
on function public.admin_clore_signalement(
    uuid,
    text,
    text
)
to authenticated;