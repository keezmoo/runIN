-- ============================================================
-- SUIVI DES PROFILS
-- ============================================================

create table public.suivis (
    utilisateur_id uuid not null,
    profil_suivi_id uuid not null,

    created_at timestamp with time zone
        not null
        default now(),

    constraint suivis_pkey
        primary key (
            utilisateur_id,
            profil_suivi_id
        ),

    constraint suivis_utilisateur_fkey
        foreign key (utilisateur_id)
        references public.profiles(id)
        on delete cascade,

    constraint suivis_profil_suivi_fkey
        foreign key (profil_suivi_id)
        references public.profiles(id)
        on delete cascade,

    constraint suivis_pas_soi_meme
        check (
            utilisateur_id
            <> profil_suivi_id
        )
);


-- Recherche rapide des abonnés d'un profil.

create index suivis_profil_suivi_idx
on public.suivis(profil_suivi_id);


-- ============================================================
-- RLS
-- ============================================================

alter table public.suivis
enable row level security;


-- Les utilisateurs connectés peuvent voir les suivis.
-- Nécessaire pour afficher abonnés / abonnements.

create policy "Lecture suivis utilisateurs connectes"
on public.suivis
for select
to authenticated
using (true);


-- Un utilisateur ne peut suivre qu'en son propre nom.

create policy "Ajouter ses propres suivis"
on public.suivis
for insert
to authenticated
with check (
    utilisateur_id = auth.uid()
    and
    profil_suivi_id <> auth.uid()
);


-- Un utilisateur ne peut supprimer que ses propres suivis.

create policy "Supprimer ses propres suivis"
on public.suivis
for delete
to authenticated
using (
    utilisateur_id = auth.uid()
);


-- Pas de UPDATE nécessaire :
-- une relation de suivi est créée ou supprimée.