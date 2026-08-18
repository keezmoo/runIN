create or replace function public.nombre_demandes_en_attente_sortie(
    p_sortie_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_nombre integer;
begin

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Utilisateur non authentifie';
    end if;


    select count(*)::integer
    into v_nombre
    from public.demandes_participation d
    where d.sortie_id = p_sortie_id
      and d.statut = 'en_attente';


    return coalesce(v_nombre, 0);

end;
$$;


revoke all
on function public.nombre_demandes_en_attente_sortie(uuid)
from public;


grant execute
on function public.nombre_demandes_en_attente_sortie(uuid)
to authenticated;