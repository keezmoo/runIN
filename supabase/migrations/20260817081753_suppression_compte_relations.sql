-- ============================================================
-- Suppression de compte
-- Rend les relations liées à la messagerie compatibles
-- avec la suppression complète d'un profil.
-- ============================================================


-- ------------------------------------------------------------
-- Conversations liées à une sortie
-- Si la sortie disparaît, ses conversations disparaissent.
-- ------------------------------------------------------------

alter table public.conversations_sortie
drop constraint if exists conversations_sortie_sortie_id_fkey;

alter table public.conversations_sortie
add constraint conversations_sortie_sortie_id_fkey
foreign key (sortie_id)
references public.sorties(id)
on delete cascade;


-- ------------------------------------------------------------
-- Conversation liée à l'utilisateur non organisateur
-- Si le profil disparaît, ses conversations disparaissent.
-- ------------------------------------------------------------

alter table public.conversations_sortie
drop constraint if exists conversations_sortie_utilisateur_id_fkey;

alter table public.conversations_sortie
add constraint conversations_sortie_utilisateur_id_fkey
foreign key (utilisateur_id)
references public.profiles(id)
on delete cascade;


-- ------------------------------------------------------------
-- Auteur d'un message
-- Suppression complète des messages appartenant au profil.
-- ------------------------------------------------------------

alter table public.messages
drop constraint if exists messages_expediteur_id_fkey;

alter table public.messages
add constraint messages_expediteur_id_fkey
foreign key (expediteur_id)
references public.profiles(id)
on delete cascade;