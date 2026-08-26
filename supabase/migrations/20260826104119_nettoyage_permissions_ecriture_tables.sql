-- ============================================================
-- NETTOYAGE DES PERMISSIONS D'ECRITURE DIRECTES
-- ============================================================


-- ------------------------------------------------------------
-- CONVERSATIONS
--
-- La création passe désormais exclusivement par les RPC :
--   ouvrir_conversation_participant()
--   ouvrir_conversation_sortie()
--
-- Le client n'a donc besoin que de SELECT.
-- ------------------------------------------------------------

revoke insert
on table public.conversations_sortie
from authenticated;


-- ------------------------------------------------------------
-- DEMANDES DE PARTICIPATION
--
-- La validation/refus passe par les RPC dédiées.
-- Le client conserve DELETE pour pouvoir annuler sa propre
-- demande en attente.
-- ------------------------------------------------------------

revoke update
on table public.demandes_participation
from authenticated;