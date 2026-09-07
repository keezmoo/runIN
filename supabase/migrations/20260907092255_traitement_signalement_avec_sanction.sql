-- ============================================================
-- TRAITEMENT D'UN SIGNALEMENT AVEC SANCTION OPTIONNELLE
--
-- Sanctions possibles :
-- - aucune
-- - suspension
-- - bannissement
--
-- La sanction éventuelle et la clôture du signalement sont
-- exécutées dans la même transaction.
-- ============================================================

create or replace function public.admin_traiter_signalement_avec_sanction(
    p_signalement_id uuid,
    p_commentaire text,
    p_sanction text default 'aucune',
    p_duree_jours integer default null
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
    v_cible_utilisateur_id uuid;

    v_commentaire text;
begin
    v_acteur_id := auth.uid();

    -- --------------------------------------------------------
    -- SECURITE
    -- --------------------------------------------------------

    if v_acteur_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;

    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception 'MFA_REQUIS';
    end if;

    if not runin_private.est_moderateur_ou_administrateur() then
        raise exception 'ACCES_ADMIN_REFUSE';
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
        or char_length(v_commentaire) > 1000
    then
        raise exception 'COMMENTAIRE_DECISION_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- TYPE DE SANCTION
    -- --------------------------------------------------------

    if p_sanction not in (
        'aucune',
        'suspension',
        'bannissement'
    ) then
        raise exception 'TYPE_SANCTION_INVALIDE';
    end if;


    -- --------------------------------------------------------
    -- VERROUILLAGE DU SIGNALEMENT
    -- --------------------------------------------------------

    select
        s.statut,
        s.assigne_a,
        s.cible_utilisateur_id
    into
        v_statut,
        v_assigne_a,
        v_cible_utilisateur_id
    from public.signalements s
    where s.id = p_signalement_id
    for update;

    if not found then
        raise exception 'SIGNALEMENT_INTROUVABLE';
    end if;


    if v_statut in (
        'traite',
        'rejete'
    ) then
        raise exception 'SIGNALEMENT_DEJA_CLOTURE';
    end if;


    if
        v_statut = 'en_cours'
        and v_assigne_a is not null
        and v_assigne_a <> v_acteur_id
    then
        raise exception 'SIGNALEMENT_PRIS_PAR_AUTRE';
    end if;


    -- --------------------------------------------------------
    -- SANCTION OPTIONNELLE
    --
    -- La cible vient du signalement lui-même.
    -- Le navigateur ne choisit donc jamais arbitrairement
    -- l'utilisateur à sanctionner.
    -- --------------------------------------------------------

    if p_sanction <> 'aucune' then

        if v_cible_utilisateur_id is null then
            raise exception 'CIBLE_SANCTION_INDISPONIBLE';
        end if;

        perform public.admin_sanctionner_utilisateur(
            v_cible_utilisateur_id,
            p_sanction,
            v_commentaire,
            case
                when p_sanction = 'suspension'
                    then p_duree_jours
                else null
            end
        );

    end if;


    -- --------------------------------------------------------
    -- CLOTURE
    --
    -- On réutilise la fonction existante afin de conserver
    -- ses contrôles et sa journalisation.
    -- --------------------------------------------------------

    perform public.admin_clore_signalement(
        p_signalement_id,
        'traite',
        v_commentaire
    );


    return true;
end;
$$;


revoke all
on function public.admin_traiter_signalement_avec_sanction(
    uuid,
    text,
    text,
    integer
)
from public, anon;

grant execute
on function public.admin_traiter_signalement_avec_sanction(
    uuid,
    text,
    text,
    integer
)
to authenticated;


notify pgrst, 'reload schema';
