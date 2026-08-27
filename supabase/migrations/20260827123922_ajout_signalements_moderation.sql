-- ============================================================
-- SIGNALEMENTS
-- ============================================================

create table public.signalements (
    id uuid primary key
        default gen_random_uuid(),

    signaleur_id uuid null
        references public.profiles(id)
        on delete set null,

    type_cible text not null
        check (
            type_cible in (
                'profil',
                'sortie'
            )
        ),

    cible_id uuid not null,

    motif text not null
        check (
            motif in (
                'spam',
                'harcelement',
                'contenu_inapproprie',
                'faux_profil',
                'comportement_dangereux',
                'autre'
            )
        ),

    commentaire text null
        check (
            commentaire is null
            or char_length(
                trim(commentaire)
            ) between 3 and 1000
        ),

    statut text not null
        default 'ouvert'
        check (
            statut in (
                'ouvert',
                'en_cours',
                'traite',
                'rejete'
            )
        ),

    assigne_a uuid null
        references public.profiles(id)
        on delete set null,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    traite_at timestamptz null
);


-- ------------------------------------------------------------
-- INDEX
-- ------------------------------------------------------------

create index signalements_statut_date_idx
on public.signalements (
    statut,
    created_at desc
);


create index signalements_cible_idx
on public.signalements (
    type_cible,
    cible_id,
    created_at desc
);


create index signalements_signaleur_idx
on public.signalements (
    signaleur_id,
    created_at desc
);


-- Un utilisateur ne peut avoir qu'un signalement encore actif
-- pour une même cible.

create unique index
    signalements_unique_actif_idx
on public.signalements (
    signaleur_id,
    type_cible,
    cible_id
)
where
    statut in (
        'ouvert',
        'en_cours'
    )
    and signaleur_id is not null;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.signalements
enable row level security;


revoke all
on table public.signalements
from anon;

revoke all
on table public.signalements
from authenticated;


-- ============================================================
-- BLOCAGE DES COMPTES SANCTIONNÉS
-- ============================================================

create trigger
    refuser_ecriture_si_sanctionne
before insert or update or delete
on public.signalements
for each row
execute function
    runin_private.refuser_ecriture_si_sanctionne();


-- ============================================================
-- CRÉER UN SIGNALEMENT
-- ============================================================

create or replace function public.creer_signalement(
    p_type_cible text,
    p_cible_id uuid,
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
    v_signalement_id uuid;
    v_commentaire text;
begin

    v_utilisateur_id :=
        auth.uid();


    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    if v_utilisateur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- TYPE DE CIBLE
    -- --------------------------------------------------------

    if p_type_cible not in (
        'profil',
        'sortie'
    ) then
        raise exception 'TYPE_CIBLE_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- MOTIF
    -- --------------------------------------------------------

    if p_motif not in (
        'spam',
        'harcelement',
        'contenu_inapproprie',
        'faux_profil',
        'comportement_dangereux',
        'autre'
    ) then
        raise exception 'MOTIF_SIGNALEMENT_INVALIDE';
    end if;


    v_commentaire :=
        nullif(
            trim(
                coalesce(
                    p_commentaire,
                    ''
                )
            ),
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
    -- PROFIL
    -- --------------------------------------------------------

    if p_type_cible = 'profil' then

        if not exists (
            select 1
            from public.profiles p
            where p.id = p_cible_id
        ) then
            raise exception 'PROFIL_INTROUVABLE';
        end if;


        if p_cible_id = v_utilisateur_id then
            raise exception 'AUTO_SIGNALEMENT_INTERDIT';
        end if;

    end if;


    -- --------------------------------------------------------
    -- SORTIE
    -- --------------------------------------------------------

    if p_type_cible = 'sortie' then

        if not exists (
            select 1
            from public.sorties s
            where s.id = p_cible_id
        ) then
            raise exception 'SORTIE_INTROUVABLE';
        end if;


        if exists (
            select 1
            from public.sorties s
            where
                s.id = p_cible_id
                and s.organisateur_id =
                    v_utilisateur_id
        ) then
            raise exception 'AUTO_SIGNALEMENT_INTERDIT';
        end if;

    end if;


    -- --------------------------------------------------------
    -- ANTI-SPAM
    --
    -- Maximum 10 nouveaux signalements sur 24 h.
    -- --------------------------------------------------------

    if (
        select count(*)
        from public.signalements s
        where
            s.signaleur_id =
                v_utilisateur_id
            and s.created_at >
                now() - interval '24 hours'
    ) >= 10 then

        raise exception
            'TROP_DE_SIGNALEMENTS';

    end if;


    -- --------------------------------------------------------
    -- SIGNALement DÉJÀ OUVERT ?
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.signalements s
        where
            s.signaleur_id =
                v_utilisateur_id

            and s.type_cible =
                p_type_cible

            and s.cible_id =
                p_cible_id

            and s.statut in (
                'ouvert',
                'en_cours'
            )
    ) then

        raise exception
            'SIGNALEMENT_DEJA_EXISTANT';

    end if;


    -- --------------------------------------------------------
    -- INSERTION
    -- --------------------------------------------------------

    insert into public.signalements (
        signaleur_id,
        type_cible,
        cible_id,
        motif,
        commentaire
    )
    values (
        v_utilisateur_id,
        p_type_cible,
        p_cible_id,
        p_motif,
        v_commentaire
    )
    returning id
    into v_signalement_id;


    return v_signalement_id;

end;
$$;


revoke all
on function public.creer_signalement(
    text,
    uuid,
    text,
    text
)
from public;

revoke all
on function public.creer_signalement(
    text,
    uuid,
    text,
    text
)
from anon;

grant execute
on function public.creer_signalement(
    text,
    uuid,
    text,
    text
)
to authenticated;