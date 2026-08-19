begin;

-- ============================================================
-- PROFILES
--
-- SELECT : affichage des profils
-- INSERT + UPDATE : nécessaires au formulaire avec upsert()
--                  et aux préférences utilisateur.
-- DELETE direct inutile.
-- ============================================================

revoke all privileges
on table public.profiles
from anon, authenticated;

grant select, insert, update
on table public.profiles
to authenticated;


-- ============================================================
-- EXCLUSIONS
--
-- Le frontend ne fait que les consulter.
-- Les insertions sont effectuées par les RPC serveur.
-- ============================================================

revoke all privileges
on table public.exclusions_sortie
from anon, authenticated;

grant select
on table public.exclusions_sortie
to authenticated;


-- ============================================================
-- NOTIFICATIONS
--
-- Lecture directe nécessaire.
-- Les modifications passent par les RPC marquer_*.
-- ============================================================

revoke all privileges
on table public.notifications
from anon, authenticated;

grant select
on table public.notifications
to authenticated;


commit;