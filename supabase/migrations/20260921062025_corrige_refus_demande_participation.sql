create or replace function public.refuser_demande_participation(
    p_demande_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_statut text;
begin

    if auth.uid() is null then
        raise exception 'Utilisateur non authentifie';
    end if;

    if not public.session_mfa_autorisee() then
        raise exception 'MFA_REQUISE';
    end if;


    -- Verifie que la demande appartient bien
    -- a une sortie organisee par l'utilisateur connecte.
    select d.statut
    into v_statut
    from public.demandes_participation d
    join public.sorties s
        on s.id = d.sortie_id
    where d.id = p_demande_id
      and s.organisateur_id = auth.uid()
    for update of d;


    if not found then
        raise exception 'Demande introuvable ou non autorisee';
    end if;


    if v_statut <> 'en_attente' then
        raise exception 'Cette demande a deja ete traitee';
    end if;


    update public.demandes_participation
    set statut = 'refusee'
    where id = p_demande_id
      and statut = 'en_attente';


    if not found then
        raise exception 'Cette demande a deja ete traitee';
    end if;

end;
$function$;


revoke all
on function public.refuser_demande_participation(uuid)
from public, anon, authenticated;


grant execute
on function public.refuser_demande_participation(uuid)
to authenticated;


grant execute
on function public.refuser_demande_participation(uuid)
to service_role;