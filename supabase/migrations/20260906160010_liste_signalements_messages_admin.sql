-- ============================================================
-- FILE DE MODERATION V2
-- Supporte profil / sortie / message
-- ============================================================

create or replace function public.admin_lister_signalements_v2(
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
        p_statut := 'a_traiter';
    end if;


    if p_type not in (
        'tous',
        'profil',
        'sortie',
        'message'
    ) then
        p_type := 'tous';
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
        p_motif := 'tous';
    end if;


    p_recherche :=
        nullif(
            btrim(p_recherche),
            ''
        );


    p_page :=
        greatest(
            coalesce(p_page, 1),
            1
        );


    p_limite :=
        case
            when p_limite in (25, 50, 100)
                then p_limite
            else 25
        end;


    -- --------------------------------------------------------
    -- RESULTATS
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
            signaleur.nom as signaleur_nom,

            s.motif,
            s.commentaire,
            s.statut,

            s.assigne_a,
            assigne.nom as assigne_nom,

            s.created_at as date_signalement

        from public.signalements s

        left join public.profiles signaleur
            on signaleur.id = s.signaleur_id

        left join public.profiles assigne
            on assigne.id = s.assigne_a

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

                or s.statut = p_statut
            )

            and (
                p_type = 'tous'
                or s.type_cible = p_type
            )

            and (
                p_motif = 'tous'
                or s.motif = p_motif
            )

            and (
                p_recherche is null

                or s.cible_libelle
                    ilike '%' || p_recherche || '%'

                or coalesce(
                    signaleur.nom,
                    ''
                )
                    ilike '%' || p_recherche || '%'

                or coalesce(
                    s.commentaire,
                    ''
                )
                    ilike '%' || p_recherche || '%'

                or coalesce(
                    s.message_contenu_snapshot,
                    ''
                )
                    ilike '%' || p_recherche || '%'

                or coalesce(
                    s.message_auteur_nom_snapshot,
                    ''
                )
                    ilike '%' || p_recherche || '%'
            )
    )

    select
        sf.id,
        sf.type_cible,
        sf.cible_id,
        sf.cible_libelle,
        sf.cible_utilisateur_id,

        sf.signaleur_id,
        sf.signaleur_nom,

        sf.motif,
        sf.commentaire,
        sf.statut,

        sf.assigne_a,
        sf.assigne_nom,

        sf.date_signalement,

        count(*) over() as total_resultats

    from signalements_filtres sf

    order by
        sf.date_signalement desc,
        sf.id desc

    limit p_limite

    offset (
        (p_page - 1)
        * p_limite
    );

end;
$$;


revoke all
on function public.admin_lister_signalements_v2(
    text,
    text,
    text,
    text,
    integer,
    integer
)
from public, anon;

grant execute
on function public.admin_lister_signalements_v2(
    text,
    text,
    text,
    text,
    integer,
    integer
)
to authenticated;


notify pgrst, 'reload schema';
