-- ============================================================
-- SÉCURISER L'ANNULATION D'UNE SORTIE
-- ============================================================

create or replace function public.annuler_sortie(
    p_sortie_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid;
begin

    -- --------------------------------------------------------
    -- AUTHENTIFICATION
    -- --------------------------------------------------------

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- MFA
    -- Même règle que les tables métier.
    -- --------------------------------------------------------

    if not public.session_mfa_autorisee() then
        raise exception 'MFA_REQUIS';
    end if;


    -- --------------------------------------------------------
    -- ANNULATION
    --
    -- On vérifie directement dans l'UPDATE que :
    -- - la sortie existe ;
    -- - l'utilisateur en est l'organisateur ;
    -- - elle est encore planifiée.
    -- --------------------------------------------------------

    update public.sorties
    set statut = 'annulee'
    where id = p_sortie_id
      and organisateur_id = v_user_id
      and statut = 'planifiee';


    if not found then
        raise exception 'SORTIE_INTROUVABLE_OU_NON_AUTORISEE';
    end if;


    -- --------------------------------------------------------
    -- DEMANDES EN ATTENTE
    --
    -- SECURITY DEFINER permet à CETTE fonction uniquement
    -- d'effectuer l'opération sans redonner UPDATE sur toute
    -- la table aux utilisateurs.
    -- --------------------------------------------------------

    update public.demandes_participation
    set statut = 'annulee'
    where sortie_id = p_sortie_id
      and statut = 'en_attente';

end;
$function$;


-- ------------------------------------------------------------
-- PERMISSIONS DU RPC
-- ------------------------------------------------------------

revoke all
on function public.annuler_sortie(uuid)
from public, anon;

grant execute
on function public.annuler_sortie(uuid)
to authenticated;