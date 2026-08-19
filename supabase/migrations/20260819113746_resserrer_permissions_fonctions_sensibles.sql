begin;

-- ============================================================
-- TRIGGER D'ENVOI DES NOTIFICATIONS EMAIL
-- Fonction interne uniquement.
-- ============================================================

revoke all
on function public.envoyer_notification_email_vault()
from public, anon, authenticated;


-- ============================================================
-- PURGE AUTOMATIQUE DES DONNEES
-- Ne doit jamais être accessible depuis le navigateur.
-- ============================================================

revoke all
on function public.purger_donnees_anciennes()
from public, anon, authenticated;

grant execute
on function public.purger_donnees_anciennes()
to service_role;


-- ============================================================
-- COMPTEUR DES DEMANDES
-- Accessible uniquement aux utilisateurs connectés.
-- ============================================================

revoke all
on function public.nombre_demandes_en_attente_sortie(uuid)
from public, anon, authenticated;

grant execute
on function public.nombre_demandes_en_attente_sortie(uuid)
to authenticated, service_role;


-- ============================================================
-- RETRAIT D'UN PARTICIPANT
-- Accessible uniquement aux utilisateurs connectés.
-- Les contrôles organisateur + MFA sont faits dans la fonction.
-- ============================================================

revoke all
on function public.retirer_participant_sortie(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.retirer_participant_sortie(uuid, uuid)
to authenticated, service_role;


-- ============================================================
-- HELPER MFA
-- Nécessaire aux RLS et RPC des utilisateurs connectés.
-- Pas d'accès anonyme.
-- ============================================================

revoke all
on function public.session_mfa_autorisee()
from public, anon, authenticated;

grant execute
on function public.session_mfa_autorisee()
to authenticated, service_role;

commit;