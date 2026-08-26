-- ============================================================
-- PERMISSIONS TABLES : BLOCAGES / SUIVIS
-- ============================================================


-- ------------------------------------------------------------
-- BLOCAGES
--
-- Les écritures passent exclusivement par :
--   bloquer_utilisateur()
--   debloquer_utilisateur()
--
-- Le client authentifié a uniquement besoin de SELECT
-- pour afficher sa propre liste de blocages.
-- ------------------------------------------------------------

revoke all privileges on table public.blocages
from public, anon, authenticated;

grant select on table public.blocages
to authenticated;


-- ------------------------------------------------------------
-- SUIVIS
--
-- Le client utilise directement :
--   SELECT
--   INSERT
--   DELETE
--
-- UPDATE, TRUNCATE, TRIGGER, REFERENCES, etc. sont inutiles.
-- ------------------------------------------------------------

revoke all privileges on table public.suivis
from public, anon, authenticated;

grant select, insert, delete on table public.suivis
to authenticated;