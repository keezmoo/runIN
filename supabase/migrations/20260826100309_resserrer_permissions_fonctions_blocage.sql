-- ============================================================
-- RESSERRER LES PERMISSIONS DES FONCTIONS PUBLIQUES
-- ============================================================


-- ------------------------------------------------------------
-- RPC UTILISÉES PAR L'APPLICATION
-- Elles nécessitent un utilisateur authentifié.
-- ------------------------------------------------------------

revoke all on function public.bloquer_utilisateur(uuid)
from public, anon;

grant execute on function public.bloquer_utilisateur(uuid)
to authenticated;


revoke all on function public.debloquer_utilisateur(uuid)
from public, anon;

grant execute on function public.debloquer_utilisateur(uuid)
to authenticated;


revoke all on function public.est_relation_bloquee(uuid)
from public, anon;

grant execute on function public.est_relation_bloquee(uuid)
to authenticated;


revoke all on function public.marquer_toutes_notifications_visibles_lues()
from public, anon;

grant execute on function public.marquer_toutes_notifications_visibles_lues()
to authenticated;


revoke all on function public.mes_utilisateurs_indisponibles()
from public, anon;

grant execute on function public.mes_utilisateurs_indisponibles()
to authenticated;


revoke all on function public.nombre_messages_non_lus_visibles()
from public, anon;

grant execute on function public.nombre_messages_non_lus_visibles()
to authenticated;


revoke all on function public.nombre_notifications_non_lues_visibles()
from public, anon;

grant execute on function public.nombre_notifications_non_lues_visibles()
to authenticated;


revoke all on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
)
from public, anon;

grant execute on function public.sorties_dans_rayon(
    double precision,
    double precision,
    double precision
)
to authenticated;


-- ------------------------------------------------------------
-- FONCTIONS DE TRIGGER
--
-- Elles ne doivent jamais être appelées directement
-- depuis le navigateur.
--
-- Le trigger PostgreSQL continuera à les utiliser.
-- ------------------------------------------------------------

revoke all on function public.verifier_blocage_conversation_sortie()
from public, anon, authenticated;

revoke all on function public.verifier_blocage_demande_participation()
from public, anon, authenticated;

revoke all on function public.verifier_blocage_message()
from public, anon, authenticated;

revoke all on function public.verifier_blocage_participation()
from public, anon, authenticated;