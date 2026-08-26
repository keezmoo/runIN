create or replace function public.coordonnees_sortie(
    p_sortie_id uuid
)
returns table (
    latitude double precision,
    longitude double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
    select
        extensions.st_y(
            s.position_depart::extensions.geometry
        )::double precision as latitude,

        extensions.st_x(
            s.position_depart::extensions.geometry
        )::double precision as longitude

    from public.sorties s

    where s.id = p_sortie_id
      and s.position_depart is not null;
$$;

revoke all
on function public.coordonnees_sortie(uuid)
from public, anon;

grant execute
on function public.coordonnees_sortie(uuid)
to authenticated, service_role;