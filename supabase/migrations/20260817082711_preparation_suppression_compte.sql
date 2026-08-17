-- ============================================================
-- Préparation à la suppression définitive d'un compte runIN
-- ============================================================

create or replace function public.preparer_suppression_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_utilisateur_id uuid;
begin

    v_utilisateur_id := auth.uid();


    if v_utilisateur_id is null then
        raise exception 'Utilisateur non authentifié';
    end if;


    -- --------------------------------------------------------
    -- 1. Sorties organisées
    --
    -- Les participations, demandes et conversations liées
    -- sont supprimées grâce aux CASCADE.
    -- --------------------------------------------------------

    delete from public.sorties
    where organisateur_id =
        v_utilisateur_id;


    -- --------------------------------------------------------
    -- 2. Messages encore écrits par l'utilisateur
    -- --------------------------------------------------------

    delete from public.messages
    where expediteur_id =
        v_utilisateur_id;


    -- --------------------------------------------------------
    -- 3. Conversations où l'utilisateur était participant
    -- --------------------------------------------------------

    delete from public.conversations_sortie
    where utilisateur_id =
        v_utilisateur_id;


    -- --------------------------------------------------------
    -- 4. Participations aux sorties des autres
    -- --------------------------------------------------------

    delete from public.participations
    where utilisateur_id =
        v_utilisateur_id;


    -- --------------------------------------------------------
    -- 5. Demandes de participation
    -- --------------------------------------------------------

    delete from public.demandes_participation
    where utilisateur_id =
        v_utilisateur_id;


    -- --------------------------------------------------------
    -- 6. Notifications
    --
    -- On supprime :
    -- - celles destinées à l'utilisateur
    -- - celles où il apparaît comme acteur
    --
    -- Cela évite de conserver son identité dans les
    -- notifications des autres utilisateurs.
    -- --------------------------------------------------------

    delete from public.notifications
    where utilisateur_id =
            v_utilisateur_id
       or acteur_id =
            v_utilisateur_id;

end;
$$;


revoke all
on function public.preparer_suppression_compte()
from public;


grant execute
on function public.preparer_suppression_compte()
to authenticated;