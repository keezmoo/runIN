-- ============================================================
-- SANCTION ACTIVE DU COMPTE CONNECTÉ
-- ============================================================

create or replace function public.ma_sanction_active()
returns table (
    sanction_id uuid,
    type text,
    motif text,
    date_debut timestamptz,
    date_fin timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        s.id,
        s.type,
        s.motif,
        s.date_debut,
        s.date_fin

    from public.sanctions_utilisateurs s

    where
        s.utilisateur_id = auth.uid()

        and s.levee_at is null

        and s.date_debut <= now()

        and (
            s.date_fin is null
            or s.date_fin > now()
        )

    order by
        s.created_at desc

    limit 1;
$$;


revoke all
on function public.ma_sanction_active()
from public;

revoke all
on function public.ma_sanction_active()
from anon;

grant execute
on function public.ma_sanction_active()
to authenticated;
