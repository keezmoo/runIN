-- ============================================================
-- REDUCTION DE LA DUREE DE CONSERVATION DES NOTIFICATIONS
-- ============================================================
-- Notifications lues     : 7 jours
-- Notifications non lues : 30 jours
-- ============================================================

create or replace function public.nettoyer_anciennes_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin

    delete from public.notifications
    where
        (
            lu_at is not null
            and lu_at <
                now() - interval '7 days'
        )
        or
        (
            lu_at is null
            and created_at <
                now() - interval '30 days'
        );

end;
$function$;


-- Aucun utilisateur de l'application
-- ne doit appeler directement cette fonction.

revoke all
on function public.nettoyer_anciennes_notifications()
from public, anon, authenticated;


-- Nettoyage immédiat lors de l'application
-- de cette migration.
select public.nettoyer_anciennes_notifications();