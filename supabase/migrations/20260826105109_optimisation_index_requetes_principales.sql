-- ============================================================
-- INDEX POUR LES REQUETES PRINCIPALES
-- ============================================================


-- ------------------------------------------------------------
-- SORTIES
--
-- Utilisé pour :
-- - sorties organisées par un utilisateur
-- - sorties futures / passées
-- - tri chronologique
-- ------------------------------------------------------------

create index if not exists sorties_organisateur_date_idx
on public.sorties (
    organisateur_id,
    date_heure_depart
);


-- ------------------------------------------------------------
-- PARTICIPATIONS
--
-- La contrainte UNIQUE actuelle est :
--   (sortie_id, utilisateur_id)
--
-- Elle est parfaite pour rechercher les participants d'une
-- sortie, mais pas pour retrouver toutes les sorties auxquelles
-- participe un utilisateur.
--
-- created_at permet également l'export chronologique.
-- ------------------------------------------------------------

create index if not exists participations_utilisateur_date_idx
on public.participations (
    utilisateur_id,
    created_at
);


-- ------------------------------------------------------------
-- DEMANDES PAR SORTIE
--
-- Utilisé pour :
-- - demandes d'une sortie
-- - demandes en attente
-- - affichage chronologique des demandes reçues
-- ------------------------------------------------------------

create index if not exists demandes_sortie_statut_date_idx
on public.demandes_participation (
    sortie_id,
    statut,
    created_at
);


-- ------------------------------------------------------------
-- DEMANDES EN ATTENTE D'UN UTILISATEUR
--
-- Index partiel volontairement petit.
-- C'est exactement la requête utilisée pour "Mes sorties".
-- ------------------------------------------------------------

create index if not exists demandes_utilisateur_en_attente_idx
on public.demandes_participation (
    utilisateur_id,
    sortie_id
)
where statut = 'en_attente';