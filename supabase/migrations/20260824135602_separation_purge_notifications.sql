-- ============================================================
-- SEPARATION DU NETTOYAGE DES NOTIFICATIONS
--
-- Les notifications sont désormais gérées par
-- nettoyer_anciennes_notifications().
--
-- Cette fonction conserve uniquement :
-- - les anciens messages
-- - les conversations devenues vides
-- ============================================================

create or replace function public.purger_donnees_anciennes()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin

    -- --------------------------------------------------------
    -- Messages
    -- Conservation : 12 mois
    -- --------------------------------------------------------

    delete from public.messages
    where created_at <
        now() - interval '12 months';


    -- --------------------------------------------------------
    -- Conversations devenues vides
    --
    -- Suppression uniquement si :
    -- - aucun message ne subsiste
    -- - la sortie date de plus de 12 mois
    -- --------------------------------------------------------

    delete from public.conversations_sortie c
    where
        not exists (
            select 1
            from public.messages m
            where m.conversation_id = c.id
        )
        and exists (
            select 1
            from public.sorties s
            where s.id = c.sortie_id
              and s.date_heure_depart <
                  now() - interval '12 months'
        );

end;
$function$;