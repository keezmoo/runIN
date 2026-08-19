begin;

-- ============================================================
-- FILTRE GEOGRAPHIQUE DE L'UTILISATEUR
-- ============================================================

revoke all
on function public.mon_filtre_geographique()
from PUBLIC, anon, authenticated;

grant execute
on function public.mon_filtre_geographique()
to authenticated, service_role;


-- ============================================================
-- RECHERCHE DES SORTIES DANS UN RAYON
-- ============================================================

revoke all
on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
)
from PUBLIC, anon, authenticated;

grant execute
on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
)
to authenticated, service_role;


commit;