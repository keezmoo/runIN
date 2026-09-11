import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import SortieForm from "./sortie-form";

export default async function NouvelleSortiePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // PROFIL
  // ------------------------------------------------

  const { data: profil, error: profilError } = await supabase
    .from("profiles")
    .select("sexe")
    .eq("id", user.id)
    .maybeSingle();

  if (profilError || !profil) {
    redirect("/profil");
  }

  // ------------------------------------------------
  // LOCALISATION PAR DEFAUT
  // ------------------------------------------------

  const { data: filtreProfilData, error: filtreProfilError } =
    await supabase.rpc("mon_filtre_geographique");

  const filtreProfil = filtreProfilData?.[0] ?? null;

  if (filtreProfilError || !filtreProfil) {
    redirect("/profil");
  }

  const lieuInitial =
    typeof filtreProfil.lieu_recherche === "string"
      ? filtreProfil.lieu_recherche.trim()
      : "";

  const latitudeInitiale = Number(filtreProfil.latitude);
  const longitudeInitiale = Number(filtreProfil.longitude);

  if (
    lieuInitial.length < 2 ||
    !Number.isFinite(latitudeInitiale) ||
    !Number.isFinite(longitudeInitiale)
  ) {
    redirect("/profil");
  }

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="hidden text-2xl font-bold md:mb-6 md:block">
        Créer une sortie
      </h1>

      <SortieForm
        sexeOrganisateur={profil.sexe as "homme" | "femme" | "autre"}
        lieuInitial={lieuInitial}
        localisationInitiale={{
          latitude: latitudeInitiale,
          longitude: longitudeInitiale,
        }}
      />
    </main>
  );
}
