-- ============================================================
-- MESSAGERIE
--
-- Les messages doivent désormais obligatoirement passer
-- par la RPC public.envoyer_message_sortie().
--
-- Cela empêche de contourner :
-- - l'anti-spam
-- - les contrôles d'accès
-- - la fermeture des conversations
-- ============================================================

revoke insert
on table public.messages
from anon, authenticated;