-- ============================================================
-- EVOLUTION DES SIGNALEMENTS EXISTANTS
--
-- La table signalements a déjà été créée par la migration
-- 20260827123922.
-- ============================================================


-- ============================================================
-- 1. LIBELLE CONSERVE DE LA CIBLE
-- ============================================================

alter table public.signalements
add column if not exists cible_libelle text;


-- Remplissage des éventuels signalements déjà existants.

update public.signalements s
set cible_libelle =
    case

        when s.type_cible = 'profil'
        then coalesce(
            (
                select p.nom
                from public.profiles p
                where p.id = s.cible_id
            ),
            'Profil supprimé'
        )

        when s.type_cible = 'sortie'
        then coalesce(
            (
                select so.titre
                from public.sorties so
                where so.id = s.cible_id
            ),
            'Sortie supprimée'
        )

        else
            'Contenu signalé'

    end

where
    s.cible_libelle is null
    or trim(s.cible_libelle) = '';


alter table public.signalements
alter column cible_libelle
set not null;


do $$
begin

    if not exists (
        select 1
        from pg_constraint c
        where
            c.conrelid =
                'public.signalements'::regclass
            and c.conname =
                'signalements_cible_libelle_check'
    ) then

        alter table public.signalements
        add constraint signalements_cible_libelle_check
        check (
            char_length(
                trim(cible_libelle)
            ) between 1 and 200
        );

    end if;

end;
$$;


-- ============================================================
-- 2. UTILISATEUR CONCERNE
--
-- profil -> propriétaire du profil
-- sortie -> organisateur
-- ============================================================

alter table public.signalements
add column if not exists cible_utilisateur_id uuid;


update public.signalements s
set cible_utilisateur_id =
    case

        when s.type_cible = 'profil'
        then (
            select p.id
            from public.profiles p
            where p.id = s.cible_id
        )

        when s.type_cible = 'sortie'
        then (
            select so.organisateur_id
            from public.sorties so
            where so.id = s.cible_id
        )

        else
            null

    end

where
    s.cible_utilisateur_id is null;


do $$
begin

    if not exists (
        select 1
        from pg_constraint c
        where
            c.conrelid =
                'public.signalements'::regclass
            and c.conname =
                'signalements_cible_utilisateur_id_fkey'
    ) then

        alter table public.signalements
        add constraint signalements_cible_utilisateur_id_fkey
        foreign key (
            cible_utilisateur_id
        )
        references public.profiles(id)
        on delete set null;

    end if;

end;
$$;


create index if not exists
    signalements_cible_utilisateur_idx
on public.signalements (
    cible_utilisateur_id,
    created_at desc
);


-- ============================================================
-- 3. CREATION D'UN SIGNALEMENT
--
-- On remplace la fonction existante afin de mémoriser aussi
-- le nom/titre de la cible et l'utilisateur concerné.
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

    v_cible_libelle text;

    v_cible_utilisateur_id uuid;
begin

    v_utilisateur_id :=
        auth.uid();


    if v_utilisateur_id is null then
        raise exception
            'NON_AUTHENTIFIE';
    end if;


    if p_type_cible not in (
        'profil',
        'sortie'
    ) then

        raise exception
            'TYPE_CIBLE_INVALIDE';

    end if;


    if p_motif not in (
        'spam',
        'harcelement',
        'contenu_inapproprie',
        'faux_profil',
        'comportement_dangereux',
        'autre'
    ) then

        raise exception
            'MOTIF_SIGNALEMENT_INVALIDE';

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

        raise exception
            'COMMENTAIRE_INVALIDE';

    end if;


    -- --------------------------------------------------------
    -- PROFIL
    -- --------------------------------------------------------

    if p_type_cible = 'profil' then

        select
            p.nom,
            p.id

        into
            v_cible_libelle,
            v_cible_utilisateur_id

        from public.profiles p

        where
            p.id =
                p_cible_id;


        if not found then
            raise exception
                'PROFIL_INTROUVABLE';
        end if;


        if
            p_cible_id =
            v_utilisateur_id
        then

            raise exception
                'AUTO_SIGNALEMENT_INTERDIT';

        end if;

    end if;


    -- --------------------------------------------------------
    -- SORTIE
    -- --------------------------------------------------------

    if p_type_cible = 'sortie' then

        select
            s.titre,
            s.organisateur_id

        into
            v_cible_libelle,
            v_cible_utilisateur_id

        from public.sorties s

        where
            s.id =
                p_cible_id;


        if not found then
            raise exception
                'SORTIE_INTROUVABLE';
        end if;


        if
            v_cible_utilisateur_id =
            v_utilisateur_id
        then

            raise exception
                'AUTO_SIGNALEMENT_INTERDIT';

        end if;

    end if;


    -- --------------------------------------------------------
    -- DEJA SIGNALE ?
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
    -- ANTI-SPAM
    -- Maximum 10 signalements sur 24 heures.
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
    -- INSERTION
    -- --------------------------------------------------------

    begin

        insert into public.signalements (
            signaleur_id,
            type_cible,
            cible_id,
            cible_libelle,
            cible_utilisateur_id,
            motif,
            commentaire
        )
        values (
            v_utilisateur_id,
            p_type_cible,
            p_cible_id,
            v_cible_libelle,
            v_cible_utilisateur_id,
            p_motif,
            v_commentaire
        )

        returning id
        into v_signalement_id;


    exception

        when unique_violation then

            raise exception
                'SIGNALEMENT_DEJA_EXISTANT';

    end;


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


-- ============================================================
-- 4. FILE DES SIGNALEMENTS POUR ADMIN / MODERATEUR
-- ============================================================

create or replace function public.admin_lister_signalements(
    p_statut text default 'a_traiter',
    p_type text default 'tous',
    p_motif text default 'tous',
    p_recherche text default null,
    p_page integer default 1,
    p_limite integer default 25
)
returns table (
    signalement_id uuid,

    type_cible text,
    cible_id uuid,
    cible_libelle text,
    cible_utilisateur_id uuid,

    signaleur_id uuid,
    signaleur_nom text,

    motif text,
    commentaire text,

    statut text,

    assigne_a uuid,
    assigne_nom text,

    date_signalement timestamptz,

    total_resultats bigint
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
    -- PARAMETRES
    -- --------------------------------------------------------

    if p_statut not in (
        'a_traiter',
        'tous',
        'ouvert',
        'en_cours',
        'traite',
        'rejete'
    ) then

        p_statut :=
            'a_traiter';

    end if;


    if p_type not in (
        'tous',
        'profil',
        'sortie'
    ) then

        p_type :=
            'tous';

    end if;


    if p_motif not in (
        'tous',
        'spam',
        'harcelement',
        'contenu_inapproprie',
        'faux_profil',
        'comportement_dangereux',
        'autre'
    ) then

        p_motif :=
            'tous';

    end if;


    p_recherche :=
        nullif(
            trim(
                p_recherche
            ),
            ''
        );


    p_page :=
        greatest(
            coalesce(
                p_page,
                1
            ),
            1
        );


    p_limite :=
        case
            when p_limite in (
                25,
                50,
                100
            )
            then p_limite

            else 25
        end;


    -- --------------------------------------------------------
    -- REQUETE
    -- --------------------------------------------------------

    return query

    with signalements_filtres as (

        select
            s.id,

            s.type_cible,
            s.cible_id,
            s.cible_libelle,
            s.cible_utilisateur_id,

            s.signaleur_id,

            ps.nom
                as signaleur_nom,

            s.motif,
            s.commentaire,

            s.statut,

            s.assigne_a,

            pa.nom
                as assigne_nom,

            s.created_at

        from public.signalements s

        left join public.profiles ps
            on ps.id =
                s.signaleur_id

        left join public.profiles pa
            on pa.id =
                s.assigne_a

        where

            (
                p_statut = 'tous'

                or (
                    p_statut = 'a_traiter'
                    and s.statut in (
                        'ouvert',
                        'en_cours'
                    )
                )

                or s.statut =
                    p_statut
            )


            and (
                p_type = 'tous'
                or s.type_cible =
                    p_type
            )


            and (
                p_motif = 'tous'
                or s.motif =
                    p_motif
            )


            and (
                p_recherche is null

                or s.cible_libelle ilike
                    '%' ||
                    p_recherche ||
                    '%'

                or ps.nom ilike
                    '%' ||
                    p_recherche ||
                    '%'

                or s.commentaire ilike
                    '%' ||
                    p_recherche ||
                    '%'
            )
    ),


    nombre_total as (

        select
            count(*)::bigint
                as total

        from signalements_filtres
    ),


    signalements_page as (

        select
            sf.*

        from signalements_filtres sf

        order by
            sf.created_at desc,
            sf.id desc

        limit p_limite

        offset (
            (p_page - 1)
            *
            p_limite
        )
    )


    select
        sp.id,

        sp.type_cible,
        sp.cible_id,
        sp.cible_libelle,
        sp.cible_utilisateur_id,

        sp.signaleur_id,
        sp.signaleur_nom,

        sp.motif,
        sp.commentaire,

        sp.statut,

        sp.assigne_a,
        sp.assigne_nom,

        sp.created_at,

        nt.total

    from signalements_page sp

    cross join nombre_total nt

    order by
        sp.created_at desc,
        sp.id desc;

end;
$$;


revoke all
on function public.admin_lister_signalements(
    text,
    text,
    text,
    text,
    integer,
    integer
)
from public;


revoke all
on function public.admin_lister_signalements(
    text,
    text,
    text,
    text,
    integer,
    integer
)
from anon;


grant execute
on function public.admin_lister_signalements(
    text,
    text,
    text,
    text,
    integer,
    integer
)
to authenticated;