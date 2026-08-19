begin;

-- ============================================================
-- PARTICIPATIONS
--
-- Lecture nécessaire dans l'application.
-- DELETE nécessaire pour quitter soi-même une sortie.
-- Les INSERT passent par les RPC sécurisées.
-- Aucun UPDATE direct nécessaire.
-- ============================================================

revoke all privileges
on table public.participations
from anon, authenticated;

grant select, delete
on table public.participations
to authenticated;


-- ============================================================
-- DEMANDES DE PARTICIPATION
--
-- SELECT : affichage des demandes.
-- UPDATE : nécessaire aux RPC SECURITY INVOKER
--          annuler_sortie / refuser_demande_participation.
-- DELETE : nécessaire pour annuler sa propre demande.
-- INSERT : passe par demander_participation_sortie().
-- ============================================================

revoke all privileges
on table public.demandes_participation
from anon, authenticated;

grant select, update, delete
on table public.demandes_participation
to authenticated;


-- ============================================================
-- CONVERSATIONS
--
-- SELECT : consultation.
-- INSERT : nécessaire à ouvrir_conversation_sortie(),
--          qui est SECURITY INVOKER.
-- ============================================================

revoke all privileges
on table public.conversations_sortie
from anon, authenticated;

grant select, insert
on table public.conversations_sortie
to authenticated;


-- ============================================================
-- SORTIES
--
-- SELECT : consultation.
-- UPDATE : modification directe + annuler_sortie()
--          qui est SECURITY INVOKER.
-- Création et suppression passent par les RPC prévues.
-- ============================================================

revoke all privileges
on table public.sorties
from anon, authenticated;

grant select, update
on table public.sorties
to authenticated;


commit;