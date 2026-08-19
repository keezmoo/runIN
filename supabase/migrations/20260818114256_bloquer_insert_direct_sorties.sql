-- ============================================================
-- BLOQUER LES INSERTIONS DIRECTES DANS SORTIES
--
-- Toute création doit désormais passer par
-- public.creer_sortie_securisee()
-- ============================================================

revoke insert
on table public.sorties
from anon, authenticated;