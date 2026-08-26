-- ============================================================
-- NOMBRE DE MESSAGES NON LUS DANS LES CONVERSATIONS VISIBLES
-- ============================================================

create or replace function public.nombre_messages_non_lus_visibles()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select count(*)
    from public.messages m
    join public.conversations_sortie c
        on c.id = m.conversation_id
    join public.sorties s
        on s.id = c.sortie_id
    where

        -- L'utilisateur connecté doit faire partie
        -- de la conversation.
        (
            s.organisateur_id = auth.uid()
            or c.utilisateur_id = auth.uid()
        )

        -- Uniquement les messages reçus et non lus.
        and m.expediteur_id <> auth.uid()
        and m.lu_at is null

        -- Même règle que la page /messages :
        -- sortie non annulée et conversation encore ouverte.
        and s.statut = 'planifiee'

        and now() <=
            s.date_heure_depart
            + (
                coalesce(s.duree_estimee_minutes, 0)
                * interval '1 minute'
            )
            + interval '12 hours'

        -- Une conversation disparaît du compteur
        -- dès qu'un blocage existe dans un sens ou l'autre.
        and not exists (
            select 1
            from public.blocages b
            where
                (
                    b.bloqueur_id = s.organisateur_id
                    and b.bloque_id = c.utilisateur_id
                )
                or
                (
                    b.bloqueur_id = c.utilisateur_id
                    and b.bloque_id = s.organisateur_id
                )
        );
$$;

revoke all
on function public.nombre_messages_non_lus_visibles()
from public;

grant execute
on function public.nombre_messages_non_lus_visibles()
to authenticated;