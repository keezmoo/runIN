-- ============================================================
-- UTILISATEURS RETIRÉS D'UNE SORTIE PAR L'ORGANISATEUR
-- ============================================================

create table public.exclusions_sortie (
    sortie_id uuid not null
        references public.sorties(id)
        on delete cascade,

    utilisateur_id uuid not null
        references public.profiles(id)
        on delete cascade,

    created_at timestamptz not null
        default now(),

    primary key (
        sortie_id,
        utilisateur_id
    )
);


alter table public.exclusions_sortie
enable row level security;


-- L'utilisateur exclu peut savoir qu'il est exclu.
-- L'organisateur peut voir les exclusions de sa propre sortie.

create policy exclusions_sortie_select
on public.exclusions_sortie
for select
to authenticated
using (
    utilisateur_id = auth.uid()

    or

    exists (
        select 1
        from public.sorties s
        where s.id = exclusions_sortie.sortie_id
          and s.organisateur_id = auth.uid()
    )
);


-- ============================================================
-- BLOQUE UNE NOUVELLE PARTICIPATION
-- ============================================================

create policy participations_non_exclu
on public.participations
as restrictive
for insert
to authenticated
with check (
    not exists (
        select 1
        from public.exclusions_sortie e
        where e.sortie_id =
            participations.sortie_id
          and e.utilisateur_id =
            participations.utilisateur_id
    )
);


-- ============================================================
-- BLOQUE UNE NOUVELLE DEMANDE
-- ============================================================

create policy demandes_non_exclu
on public.demandes_participation
as restrictive
for insert
to authenticated
with check (
    not exists (
        select 1
        from public.exclusions_sortie e
        where e.sortie_id =
            demandes_participation.sortie_id
          and e.utilisateur_id =
            demandes_participation.utilisateur_id
    )
);