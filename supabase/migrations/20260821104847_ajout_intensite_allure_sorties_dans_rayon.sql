drop function if exists public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
);

create function public.sorties_dans_rayon(
    p_latitude double precision,
    p_longitude double precision,
    p_rayon_km double precision
)
returns table(
    id uuid,
    titre text,
    organisateur_id uuid,
    nombre_max_participants smallint,
    date_heure_depart timestamp with time zone,
    lieu_depart text,
    type_sortie text,
    mode_inscription text,
    type_entrainement text,
    distance_km numeric,
    denivele_positif_m integer,
    duree_estimee_minutes integer,
    intensite text,
    allure_secondes_km integer,
    distance_geo_km double precision
)
language plpgsql
security invoker
set search_path to ''
as $function$
begin

    if p_rayon_km is null
       or p_rayon_km <= 0
       or p_rayon_km > 100
    then
        raise exception 'RAYON_RECHERCHE_INVALIDE';
    end if;


    return query
    select
        s.id,
        s.titre,
        s.organisateur_id,
        s.nombre_max_participants,
        s.date_heure_depart,
        s.lieu_depart,
        s.type_sortie,
        s.mode_inscription,
        s.type_entrainement,
        s.distance_km,
        s.denivele_positif_m,
        s.duree_estimee_minutes,

        -- Informations sportives ajoutées
        s.intensite,
        s.allure_secondes_km,

        extensions.st_distance(
            s.position_depart,
            extensions.st_setsrid(
                extensions.st_makepoint(
                    p_longitude,
                    p_latitude
                ),
                4326
            )::extensions.geography
        ) / 1000.0

    from public.sorties s

    where s.position_depart is not null
      and s.statut = 'planifiee'

      and extensions.st_dwithin(
          s.position_depart,
          extensions.st_setsrid(
              extensions.st_makepoint(
                  p_longitude,
                  p_latitude
              ),
              4326
          )::extensions.geography,
          p_rayon_km * 1000
      )

    order by s.date_heure_depart asc;

end;
$function$;


revoke all on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
) from public;

grant execute on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
) to authenticated;

grant execute on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
) to service_role;