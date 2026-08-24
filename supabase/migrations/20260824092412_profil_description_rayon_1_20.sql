-- ------------------------------------------------
-- DESCRIPTION DU PROFIL
-- ------------------------------------------------

alter table public.profiles
add column if not exists description text;


alter table public.profiles
drop constraint if exists profiles_description_check;


alter table public.profiles
add constraint profiles_description_check
check (
    description is null
    or char_length(trim(description)) <= 500
);


-- ------------------------------------------------
-- RAYON DE RECHERCHE : 1 À 20 KM
-- ------------------------------------------------

-- Les anciennes valeurs 30 / 50 / 100 km
-- deviennent 20 km.

update public.profiles
set rayon_recherche_km = 20
where rayon_recherche_km > 20;


alter table public.profiles
drop constraint if exists profiles_rayon_recherche_check;


alter table public.profiles
add constraint profiles_rayon_recherche_check
check (
    rayon_recherche_km >= 1
    and rayon_recherche_km <= 20
);