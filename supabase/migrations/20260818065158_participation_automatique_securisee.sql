-- ============================================================
-- PARTICIPATIONS / DEMANDES SECURISEES
--
-- Objectif :
-- - toujours utiliser l'état ACTUEL de la sortie
-- - empêcher une ancienne page de contourner un changement
-- - empêcher le dépassement du nombre de places via les RPC
-- - conserver cooldown / exclusions / MFA
-- ============================================================


-- ============================================================
-- 1. HELPER : LA SORTIE A-T-ELLE ENCORE UNE PLACE ?
-- ============================================================

create or replace function runin_private.sortie_non_complete(
    p_sortie_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
    select exists (

        select 1

        from public.sorties s

        where s.id = p_sortie_id

          and (
              1 + (
                  select count(*)
                  from public.participations p
                  where p.sortie_id = s.id
              )
          ) < s.nombre_max_participants

    );
$$;


revoke all
on function runin_private.sortie_non_complete(uuid)
from public, anon;


grant execute
on function runin_private.sortie_non_complete(uuid)
to authenticated;



-- ============================================================
-- 2. RPC : REJOINDRE UNE SORTIE AUTOMATIQUE
-- ============================================================

create or replace function public.rejoindre_sortie_automatique(
    p_sortie_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;

    v_organisateur_id uuid;
    v_mode_inscription text;
    v_statut text;
    v_date_heure timestamptz;
    v_nb_max smallint;

    v_nb_actuel integer;
begin

    v_user_id := auth.uid();


    -- --------------------------------------------------------
    -- Authentification
    -- --------------------------------------------------------

    if v_user_id is null then
        raise exception 'UTILISATEUR_NON_AUTHENTIFIE';
    end if;


    -- --------------------------------------------------------
    -- MFA
    -- --------------------------------------------------------

    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    -- --------------------------------------------------------
    -- On verrouille la sortie.
    --
    -- Deux inscriptions simultanées sur la dernière place
    -- seront donc traitées l'une après l'autre.
    -- --------------------------------------------------------

    select
        s.organisateur_id,
        s.mode_inscription,
        s.statut,
        s.date_heure_depart,
        s.nombre_max_participants

    into
        v_organisateur_id,
        v_mode_inscription,
        v_statut,
        v_date_heure,
        v_nb_max

    from public.sorties s

    where s.id = p_sortie_id

    for update;


    if not found then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    -- --------------------------------------------------------
    -- L'organisateur participe déjà implicitement.
    -- --------------------------------------------------------

    if v_organisateur_id = v_user_id then
        raise exception 'ORGANISATEUR_DEJA_PARTICIPANT';
    end if;


    -- --------------------------------------------------------
    -- Etat ACTUEL de la sortie
    -- --------------------------------------------------------

    if v_statut <> 'planifiee' then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_date_heure <= now() then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_mode_inscription <> 'automatique' then
        raise exception 'SORTIE_MODE_VALIDATION';
    end if;


    -- --------------------------------------------------------
    -- Participant retiré par l'organisateur
    -- --------------------------------------------------------

    if exists (

        select 1

        from public.exclusions_sortie e

        where e.sortie_id = p_sortie_id
          and e.utilisateur_id = v_user_id

    ) then

        raise exception 'UTILISATEUR_EXCLU';

    end if;


    -- --------------------------------------------------------
    -- Cooldown 30 secondes
    -- --------------------------------------------------------

    if not runin_private.reinscription_sortie_autorisee(
        p_sortie_id,
        v_user_id
    ) then

        raise exception 'COOLDOWN_REINSCRIPTION';

    end if;


    -- --------------------------------------------------------
    -- Déjà participant :
    -- comportement idempotent.
    --
    -- Pas de deuxième insertion,
    -- donc pas de deuxième notification.
    -- --------------------------------------------------------

    if exists (

        select 1

        from public.participations p

        where p.sortie_id = p_sortie_id
          and p.utilisateur_id = v_user_id

    ) then

        return;

    end if;


    -- --------------------------------------------------------
    -- Nombre de participants ACTUEL.
    --
    -- +1 = organisateur.
    -- --------------------------------------------------------

    select
        1 + count(*)

    into v_nb_actuel

    from public.participations p

    where p.sortie_id = p_sortie_id;


    if v_nb_actuel >= v_nb_max then
        raise exception 'SORTIE_COMPLETE';
    end if;


    -- --------------------------------------------------------
    -- Inscription
    -- --------------------------------------------------------

    insert into public.participations (
        sortie_id,
        utilisateur_id
    )
    values (
        p_sortie_id,
        v_user_id
    );

end;
$$;


revoke all
on function public.rejoindre_sortie_automatique(uuid)
from public, anon;


grant execute
on function public.rejoindre_sortie_automatique(uuid)
to authenticated;


grant execute
on function public.rejoindre_sortie_automatique(uuid)
to service_role;



-- ============================================================
-- 3. RPC : DEMANDER A PARTICIPER
-- ============================================================

create or replace function public.demander_participation_sortie(
    p_sortie_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;

    v_organisateur_id uuid;
    v_mode_inscription text;
    v_statut text;
    v_date_heure timestamptz;
    v_nb_max smallint;

    v_nb_actuel integer;
begin

    v_user_id := auth.uid();


    if v_user_id is null then
        raise exception 'UTILISATEUR_NON_AUTHENTIFIE';
    end if;


    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    -- Verrouillage de la sortie.

    select
        s.organisateur_id,
        s.mode_inscription,
        s.statut,
        s.date_heure_depart,
        s.nombre_max_participants

    into
        v_organisateur_id,
        v_mode_inscription,
        v_statut,
        v_date_heure,
        v_nb_max

    from public.sorties s

    where s.id = p_sortie_id

    for update;


    if not found then
        raise exception 'SORTIE_INTROUVABLE';
    end if;


    if v_organisateur_id = v_user_id then
        raise exception 'ORGANISATEUR_DEJA_PARTICIPANT';
    end if;


    if v_statut <> 'planifiee' then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_date_heure <= now() then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_mode_inscription <> 'validation' then
        raise exception 'SORTIE_MODE_AUTOMATIQUE';
    end if;


    -- Utilisateur retiré par l'organisateur.

    if exists (

        select 1

        from public.exclusions_sortie e

        where e.sortie_id = p_sortie_id
          and e.utilisateur_id = v_user_id

    ) then

        raise exception 'UTILISATEUR_EXCLU';

    end if;


    -- Cooldown.

    if not runin_private.reinscription_sortie_autorisee(
        p_sortie_id,
        v_user_id
    ) then

        raise exception 'COOLDOWN_REINSCRIPTION';

    end if;


    -- Déjà participant.

    if exists (

        select 1

        from public.participations p

        where p.sortie_id = p_sortie_id
          and p.utilisateur_id = v_user_id

    ) then

        raise exception 'DEJA_PARTICIPANT';

    end if;


    -- Une demande en attente existe déjà :
    -- on ne crée rien de plus.

    if exists (

        select 1

        from public.demandes_participation d

        where d.sortie_id = p_sortie_id
          and d.utilisateur_id = v_user_id
          and d.statut = 'en_attente'

    ) then

        return;

    end if;


    -- --------------------------------------------------------
    -- POUR L'INSTANT :
    -- une sortie complète n'accepte plus de nouvelle demande.
    --
    -- On pourra revoir cette règle plus tard.
    -- --------------------------------------------------------

    select
        1 + count(*)

    into v_nb_actuel

    from public.participations p

    where p.sortie_id = p_sortie_id;


    if v_nb_actuel >= v_nb_max then
        raise exception 'SORTIE_COMPLETE';
    end if;


    insert into public.demandes_participation (
        sortie_id,
        utilisateur_id,
        statut
    )
    values (
        p_sortie_id,
        v_user_id,
        'en_attente'
    );

end;
$$;


revoke all
on function public.demander_participation_sortie(uuid)
from public, anon;


grant execute
on function public.demander_participation_sortie(uuid)
to authenticated;


grant execute
on function public.demander_participation_sortie(uuid)
to service_role;



-- ============================================================
-- 4. SECURISER EGALEMENT L'ACCEPTATION D'UNE DEMANDE
-- ============================================================

create or replace function public.accepter_demande_participation(
    p_demande_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_sortie_id uuid;
    v_utilisateur_id uuid;
    v_statut_demande text;

    v_organisateur_id uuid;
    v_mode_inscription text;
    v_statut_sortie text;
    v_date_heure timestamptz;

    v_nb_max smallint;
    v_nb_actuel integer;
begin

    if auth.uid() is null then
        raise exception 'UTILISATEUR_NON_AUTHENTIFIE';
    end if;


    if not public.session_mfa_autorisee() then
        raise exception 'SESSION_MFA_REQUISE';
    end if;


    -- --------------------------------------------------------
    -- Verrouille demande + sortie.
    -- --------------------------------------------------------

    select
        d.sortie_id,
        d.utilisateur_id,
        d.statut,

        s.organisateur_id,
        s.mode_inscription,
        s.statut,
        s.date_heure_depart,
        s.nombre_max_participants

    into
        v_sortie_id,
        v_utilisateur_id,
        v_statut_demande,

        v_organisateur_id,
        v_mode_inscription,
        v_statut_sortie,
        v_date_heure,
        v_nb_max

    from public.demandes_participation d

    join public.sorties s
        on s.id = d.sortie_id

    where d.id = p_demande_id

    for update of d, s;


    if not found then
        raise exception 'DEMANDE_INTROUVABLE';
    end if;


    -- --------------------------------------------------------
    -- Seul l'organisateur peut accepter.
    -- --------------------------------------------------------

    if v_organisateur_id <> auth.uid() then
        raise exception 'DEMANDE_NON_AUTORISEE';
    end if;


    if v_statut_demande <> 'en_attente' then
        raise exception 'DEMANDE_DEJA_TRAITEE';
    end if;


    -- --------------------------------------------------------
    -- Etat ACTUEL de la sortie.
    -- --------------------------------------------------------

    if v_statut_sortie <> 'planifiee' then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_date_heure <= now() then
        raise exception 'SORTIE_INDISPONIBLE';
    end if;


    if v_mode_inscription <> 'validation' then
        raise exception 'SORTIE_MODE_AUTOMATIQUE';
    end if;


    -- --------------------------------------------------------
    -- L'utilisateur a pu être retiré entre-temps.
    -- --------------------------------------------------------

    if exists (

        select 1

        from public.exclusions_sortie e

        where e.sortie_id = v_sortie_id
          and e.utilisateur_id = v_utilisateur_id

    ) then

        raise exception 'UTILISATEUR_EXCLU';

    end if;


    -- --------------------------------------------------------
    -- Déjà participant.
    -- --------------------------------------------------------

    if exists (

        select 1

        from public.participations p

        where p.sortie_id = v_sortie_id
          and p.utilisateur_id = v_utilisateur_id

    ) then

        update public.demandes_participation

        set statut = 'acceptee'

        where id = p_demande_id;

        return;

    end if;


    -- --------------------------------------------------------
    -- Capacité.
    -- --------------------------------------------------------

    select
        1 + count(*)

    into v_nb_actuel

    from public.participations p

    where p.sortie_id = v_sortie_id;


    if v_nb_actuel >= v_nb_max then
        raise exception 'SORTIE_COMPLETE';
    end if;


    -- --------------------------------------------------------
    -- Inscription puis acceptation.
    -- --------------------------------------------------------

    insert into public.participations (
        sortie_id,
        utilisateur_id
    )
    values (
        v_sortie_id,
        v_utilisateur_id
    );


    update public.demandes_participation

    set statut = 'acceptee'

    where id = p_demande_id;

end;
$$;


revoke all
on function public.accepter_demande_participation(uuid)
from public, anon;


grant execute
on function public.accepter_demande_participation(uuid)
to authenticated;


grant execute
on function public.accepter_demande_participation(uuid)
to service_role;



-- ============================================================
-- 5. PROTECTION RLS CONTRE LES INSERTS DIRECTS AVEC UNE PAGE
--    OBSOLETE.
--
-- Les RPC ci-dessus restent la voie normale de l'application.
-- ============================================================


-- ------------------------------------------------------------
-- Participations
-- ------------------------------------------------------------

drop policy if exists
participations_mode_actuel
on public.participations;


create policy participations_mode_actuel
on public.participations

as restrictive

for insert

to authenticated

with check (

    exists (

        select 1

        from public.sorties s

        where s.id = participations.sortie_id

          and s.statut = 'planifiee'

          and s.date_heure_depart > now()

          and (

              -- Inscription automatique de soi-même.

              (
                  participations.utilisateur_id = auth.uid()

                  and
                  s.mode_inscription = 'automatique'
              )

              or

              -- Acceptation par l'organisateur.

              (
                  s.organisateur_id = auth.uid()

                  and
                  s.mode_inscription = 'validation'

                  and exists (

                      select 1

                      from public.demandes_participation d

                      where
                          d.sortie_id =
                              participations.sortie_id

                          and
                          d.utilisateur_id =
                              participations.utilisateur_id

                          and
                          d.statut = 'en_attente'

                  )
              )

          )

    )

);


-- ------------------------------------------------------------
-- Demandes
-- ------------------------------------------------------------

drop policy if exists
demandes_mode_actuel
on public.demandes_participation;


create policy demandes_mode_actuel
on public.demandes_participation

as restrictive

for insert

to authenticated

with check (

    demandes_participation.utilisateur_id =
        auth.uid()

    and

    demandes_participation.statut =
        'en_attente'

    and

    exists (

        select 1

        from public.sorties s

        where s.id =
            demandes_participation.sortie_id

          and s.organisateur_id <>
              auth.uid()

          and s.mode_inscription =
              'validation'

          and s.statut =
              'planifiee'

          and s.date_heure_depart >
              now()

    )

    and

    runin_private.sortie_non_complete(
        demandes_participation.sortie_id
    )

);