create or replace function public.marquer_toutes_notifications_visibles_lues()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin

    update public.notifications n
    set lu_at = now()
    where
        n.utilisateur_id = auth.uid()
        and n.lu_at is null

        -- Notification sans acteur :
        -- elle reste toujours visible.
        and (
            n.acteur_id is null

            or not exists (
                select 1
                from public.blocages b
                where
                    (
                        b.bloqueur_id = auth.uid()
                        and b.bloque_id = n.acteur_id
                    )
                    or
                    (
                        b.bloqueur_id = n.acteur_id
                        and b.bloque_id = auth.uid()
                    )
            )
        );

end;
$$;

revoke all
on function public.marquer_toutes_notifications_visibles_lues()
from public;

grant execute
on function public.marquer_toutes_notifications_visibles_lues()
to authenticated;