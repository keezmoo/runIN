-- ============================================================
-- ANTI-SPAM PARTICIPATIONS
--
-- 5 désinscriptions / annulations de demande
-- sur la même sortie en moins de 10 minutes
-- => blocage de réinscription pendant 1 heure
-- ============================================================


-- ------------------------------------------------------------
-- 1. Historique privé
-- ------------------------------------------------------------

create table if not exists
runin_private.actions_anti_spam_participation (

    id bigint generated always as identity
        primary key,

    sortie_id uuid not null
        references public.sorties(id)
        on delete cascade,

    utilisateur_id uuid not null
        references public.profiles(id)
        on delete cascade,

    type_action text not null
        check (
            type_action in (
                'desinscription',
                'annulation_demande'
            )
        ),

    created_at timestamptz not null
        default now()
);


create index if not exists
actions_anti_spam_participation_recherche_idx

on runin_private.actions_anti_spam_participation (
    utilisateur_id,
    sortie_id,
    created_at desc
);


revoke all
on runin_private.actions_anti_spam_participation
from public, anon, authenticated;



-- ============================================================
-- 2. ENREGISTRER UNE ACTION ET APPLIQUER LE BLOCAGE
-- ============================================================

create or replace function
runin_private.enregistrer_action_anti_spam_participation(
    p_sortie_id uuid,
    p_utilisateur_id uuid,
    p_type_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre_actions integer;
begin

    if p_type_action not in (
        'desinscription',
        'annulation_demande'
    ) then

        raise exception
            'TYPE_ACTION_ANTI_SPAM_INVALIDE';

    end if;


    insert into
    runin_private.actions_anti_spam_participation (
        sortie_id,
        utilisateur_id,
        type_action
    )
    values (
        p_sortie_id,
        p_utilisateur_id,
        p_type_action
    );


    -- Nombre d'actions similaires
    -- sur cette sortie durant les 10 dernières minutes.

    select count(*)

    into v_nombre_actions

    from
    runin_private.actions_anti_spam_participation a

    where
        a.sortie_id =
            p_sortie_id

        and
        a.utilisateur_id =
            p_utilisateur_id

        and
        a.created_at >=
            now() - interval '10 minutes';


    -- A partir de la 5e action :
    -- blocage pendant une heure.

    if v_nombre_actions >= 5 then

        insert into
        runin_private.cooldowns_sortie (
            sortie_id,
            utilisateur_id,
            rejoindre_apres,
            updated_at
        )

        values (
            p_sortie_id,
            p_utilisateur_id,
            now() + interval '1 hour',
            now()
        )

        on conflict (
            sortie_id,
            utilisateur_id
        )

        do update
        set
            rejoindre_apres =
                greatest(
                    runin_private.cooldowns_sortie.rejoindre_apres,
                    excluded.rejoindre_apres
                ),

            updated_at =
                now();

    end if;

end;
$$;


revoke all
on function
runin_private.enregistrer_action_anti_spam_participation(
    uuid,
    uuid,
    text
)
from public, anon, authenticated;



-- ============================================================
-- 3. AJOUT DE L'ANTI-SPAM À LA DÉSINSCRIPTION
-- ============================================================

create or replace function
runin_private.cooldown_apres_desinscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    -- Uniquement lorsque l'utilisateur
    -- quitte lui-même la sortie.
    --
    -- Si l'organisateur le retire,
    -- auth.uid() est l'organisateur.

    if auth.uid() is not null
       and auth.uid() = old.utilisateur_id then


        -- Cooldown normal de 30 secondes.

        perform
        runin_private.enregistrer_cooldown_sortie(
            old.sortie_id,
            old.utilisateur_id
        );


        -- Historique anti-spam.

        perform
        runin_private.enregistrer_action_anti_spam_participation(
            old.sortie_id,
            old.utilisateur_id,
            'desinscription'
        );

    end if;


    return old;

end;
$$;



-- ============================================================
-- 4. AJOUT DE L'ANTI-SPAM À L'ANNULATION D'UNE DEMANDE
-- ============================================================

create or replace function
runin_private.cooldown_apres_annulation_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    -- --------------------------------------------------------
    -- DELETE d'une demande en attente
    -- --------------------------------------------------------

    if tg_op = 'DELETE' then

        if old.statut = 'en_attente'
           and auth.uid() is not null
           and auth.uid() = old.utilisateur_id then


            perform
            runin_private.enregistrer_cooldown_sortie(
                old.sortie_id,
                old.utilisateur_id
            );


            perform
            runin_private.enregistrer_action_anti_spam_participation(
                old.sortie_id,
                old.utilisateur_id,
                'annulation_demande'
            );

        end if;


        return old;

    end if;


    -- --------------------------------------------------------
    -- UPDATE :
    -- en_attente -> annulee
    -- --------------------------------------------------------

    if tg_op = 'UPDATE' then

        if old.statut = 'en_attente'
           and new.statut = 'annulee'
           and auth.uid() is not null
           and auth.uid() = old.utilisateur_id then


            perform
            runin_private.enregistrer_cooldown_sortie(
                old.sortie_id,
                old.utilisateur_id
            );


            perform
            runin_private.enregistrer_action_anti_spam_participation(
                old.sortie_id,
                old.utilisateur_id,
                'annulation_demande'
            );

        end if;


        return new;

    end if;


    return null;

end;
$$;