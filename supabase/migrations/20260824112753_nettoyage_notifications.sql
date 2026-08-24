-- ============================================================
-- NETTOYAGE AUTOMATIQUE DES ANCIENNES NOTIFICATIONS
-- ============================================================

create extension if not exists pg_cron;


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
                now() - interval '30 days'
        )
        or
        (
            lu_at is null
            and created_at <
                now() - interval '90 days'
        );

end;
$function$;


-- Aucun utilisateur de l'application
-- ne doit appeler directement cette fonction.

revoke all
on function public.nettoyer_anciennes_notifications()
from public;

revoke all
on function public.nettoyer_anciennes_notifications()
from anon;

revoke all
on function public.nettoyer_anciennes_notifications()
from authenticated;


