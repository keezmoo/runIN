import { createClient } from "@/lib/supabase/server";

import { notFound, redirect } from "next/navigation";

import ModifierSortieForm from "./modifier-sortie-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ModifierSortiePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // ------------------------------------------------
  // UTILISATEUR CONNECTÉ
  // ------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // SORTIE
  // ------------------------------------------------

  const { data: sortie, error } = await supabase
    .from("sorties")
    .select(
      `
            id,
            titre,
            organisateur_id,
            nombre_max_participants,
            date_heure_depart,
            lieu_depart,
            type_sortie,
            mode_inscription,
            type_entrainement,
            distance_km,
            denivele_positif_m,
            duree_estimee_minutes,
            intensite,
            allure_secondes_km,
            genres_autorises,
            description
        `,
    )
    .eq("id", id)
    .eq("organisateur_id", user.id)
    .eq("statut", "planifiee")
    .maybeSingle();

  if (error || !sortie) {
    notFound();
  }

  // ------------------------------------------------
  // COORDONNÉES DU POINT DE DÉPART
  // ------------------------------------------------

  const { data: coordonneesData, error: coordonneesError } = await supabase.rpc(
    "coordonnees_sortie",
    {
      p_sortie_id: sortie.id,
    },
  );

  if (coordonneesError) {
    console.error("Erreur chargement coordonnées :", coordonneesError);
  }

  const coordonnees = coordonneesData?.[0] ?? null;

  const latitude = coordonnees ? Number(coordonnees.latitude) : NaN;

  const longitude = coordonnees ? Number(coordonnees.longitude) : NaN;

  const localisationInitiale =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? {
          latitude,
          longitude,
        }
      : null;

  const { data: profilOrganisateur, error: profilOrganisateurError } =
    await supabase.from("profiles").select("sexe").eq("id", user.id).single();

  if (profilOrganisateurError || !profilOrganisateur) {
    redirect("/profil");
  }
  // ------------------------------------------------
  // NOMBRE DE PARTICIPANTS
  // ------------------------------------------------

  const { count } = await supabase
    .from("participations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("sortie_id", id);

  // L'organisateur compte comme participant.
  const nombreParticipants = (count ?? 0) + 1;

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Modifier la sortie</h1>

      <ModifierSortieForm
        sortie={sortie}
        nombreParticipants={nombreParticipants}
        sexeOrganisateur={
          profilOrganisateur.sexe as "homme" | "femme" | "autre"
        }
        localisationInitiale={localisationInitiale}
      />
    </main>
  );
}
