-- ============================================================
-- PREFERENCES DE NOTIFICATIONS E-MAIL
-- ============================================================
-- Le réglage global était auparavant stocké dans
-- profiles.notifications_email_activees.
--
-- On le déplace progressivement dans une table dédiée afin de :
-- - séparer les préférences du profil public ;
-- - permettre des réglages par catégorie ;
-- - conserver une architecture évolutive.
-- ============================================================


create table public.preferences_notifications_email (
    utilisateur_id uuid primary key
        references public.profiles(id)
        on delete cascade,

    activees boolean not null default false,

    participations boolean not null default true,

    sorties boolean not null default true,

    created_at timestamp with time zone not null default now()
);


-- ============================================================
-- MIGRATION DES PREFERENCES EXISTANTES
-- ============================================================

insert into public.preferences_notifications_email (
    utilisateur_id,
    activees
)
select
    id,
    notifications_email_activees
from public.profiles
on conflict (utilisateur_id) do nothing;


-- ============================================================
-- RLS
-- ============================================================

alter table public.preferences_notifications_email
    enable row level security;


revoke all
on table public.preferences_notifications_email
from public, anon, authenticated;


grant select, insert, update
on table public.preferences_notifications_email
to authenticated;


grant all
on table public.preferences_notifications_email
to service_role;


-- Lecture de ses propres préférences.

create policy preferences_notifications_email_select_own
on public.preferences_notifications_email
for select
to authenticated
using (
    (select auth.uid()) = utilisateur_id
);


-- Création de ses propres préférences.

create policy preferences_notifications_email_insert_own
on public.preferences_notifications_email
for insert
to authenticated
with check (
    (select auth.uid()) = utilisateur_id
);


-- Modification de ses propres préférences.

create policy preferences_notifications_email_update_own
on public.preferences_notifications_email
for update
to authenticated
using (
    (select auth.uid()) = utilisateur_id
)
with check (
    (select auth.uid()) = utilisateur_id
);


-- Même protection MFA que le reste des données privées runIN.

create policy preferences_notifications_email_mfa_restrictive
on public.preferences_notifications_email
as restrictive
for all
to authenticated
using (
    public.session_mfa_autorisee()
)
with check (
    public.session_mfa_autorisee()
);


-- ============================================================
-- PREFERENCES PAR DEFAUT POUR LES FUTURS PROFILS
-- ============================================================

create or replace function runin_private.creer_preferences_notifications_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin

    insert into public.preferences_notifications_email (
        utilisateur_id
    )
    values (
        new.id
    )
    on conflict (utilisateur_id) do nothing;

    return new;

end;
$function$;


revoke all
on function runin_private.creer_preferences_notifications_email()
from public, anon, authenticated;


drop trigger if exists
    creer_preferences_notifications_email
on public.profiles;


create trigger creer_preferences_notifications_email
after insert
on public.profiles
for each row
execute function runin_private.creer_preferences_notifications_email();