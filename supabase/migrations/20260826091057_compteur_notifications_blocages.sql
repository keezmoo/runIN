-- ============================================================
-- NOTIFICATIONS NON LUES VISIBLES
-- ============================================================

create or replace function public.nombre_notifications_non_lues_visibles()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select count(*)
    from public.notifications n
    where
        n.utilisateur_id = auth.uid()
        and n.lu_at is null

        -- Les notifications sans acteur restent visibles.
        -- Sinon, elles disparaissent si une relation
        -- de blocage existe dans un sens ou dans l'autre.
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
$$;

revoke all
on function public.nombre_notifications_non_lues_visibles()
from public;

grant execute
on function public.nombre_notifications_non_lues_visibles()
to authenticated;