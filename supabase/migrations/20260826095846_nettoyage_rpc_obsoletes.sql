-- ============================================================
-- NETTOYAGE DES RPC OBSOLÈTES
-- ============================================================

-- Ancien compteur de messages.
-- Remplacé par nombre_messages_non_lus_visibles().
drop function if exists public.nombre_messages_non_lus();


-- Ancien compteur de notifications.
-- Remplacé par nombre_notifications_non_lues_visibles().
drop function if exists public.nombre_notifications_non_lues();


-- Ancienne fonction "tout marquer comme lu".
-- Remplacée par marquer_toutes_notifications_visibles_lues().
drop function if exists public.marquer_toutes_notifications_lues();


-- Ancienne surcharge de création de sortie,
-- antérieure à l'ajout de p_genres_autorises.
drop function if exists public.creer_sortie_securisee(
    text,
    smallint,
    timestamp with time zone,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    numeric,
    integer,
    integer,
    text,
    integer,
    text
);