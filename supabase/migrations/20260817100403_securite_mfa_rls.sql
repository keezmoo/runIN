-- ============================================================
-- MFA : protection RLS des données runIN
--
-- Si un utilisateur possède un facteur MFA vérifié :
--     aal2 obligatoire
--
-- Si aucun MFA n'est activé :
--     aal1 ou aal2 accepté
-- ============================================================


-- ------------------------------------------------------------
-- Fonction utilitaire
-- ------------------------------------------------------------

create or replace function public.session_mfa_autorisee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        case
            when exists (
                select 1
                from auth.mfa_factors
                where user_id = auth.uid()
                  and status = 'verified'
            )
            then coalesce(
                auth.jwt() ->> 'aal',
                'aal1'
            ) = 'aal2'

            else true
        end;
$$;


revoke all
on function public.session_mfa_autorisee()
from public;


grant execute
on function public.session_mfa_autorisee()
to authenticated;


-- ============================================================
-- PROFILES
-- ============================================================

drop policy if exists
    profiles_mfa_restrictive
on public.profiles;

create policy profiles_mfa_restrictive
on public.profiles
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
-- SORTIES
-- ============================================================

drop policy if exists
    sorties_mfa_restrictive
on public.sorties;

create policy sorties_mfa_restrictive
on public.sorties
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
-- PARTICIPATIONS
-- ============================================================

drop policy if exists
    participations_mfa_restrictive
on public.participations;

create policy participations_mfa_restrictive
on public.participations
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
-- DEMANDES DE PARTICIPATION
-- ============================================================

drop policy if exists
    demandes_mfa_restrictive
on public.demandes_participation;

create policy demandes_mfa_restrictive
on public.demandes_participation
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
-- CONVERSATIONS
-- ============================================================

drop policy if exists
    conversations_mfa_restrictive
on public.conversations_sortie;

create policy conversations_mfa_restrictive
on public.conversations_sortie
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
-- MESSAGES
-- ============================================================

drop policy if exists
    messages_mfa_restrictive
on public.messages;

create policy messages_mfa_restrictive
on public.messages
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
-- NOTIFICATIONS
-- ============================================================

drop policy if exists
    notifications_mfa_restrictive
on public.notifications;

create policy notifications_mfa_restrictive
on public.notifications
as restrictive
for all
to authenticated
using (
    public.session_mfa_autorisee()
)
with check (
    public.session_mfa_autorisee()
);