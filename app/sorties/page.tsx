import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavigationHeures from "./navigation-heures";
import { afficherAllure, afficherIntensite } from "@/lib/sortie-utils";
import FiltresSorties from "./filtres-sorties";
import NavigationJours from "./navigation-jours";
import {
  ajouterJours,
  formatDateLongue,
  formatHeure,
  getDateKey,
} from "@/lib/date-utils";

type SortiesPageProps = {
  searchParams: Promise<{
    lieu?: string;
    rayon?: string;
    lat?: string;
    lon?: string;
    type?: string;
    date?: string;

    distanceMin?: string;
    distanceMax?: string;

    deniveleMin?: string;
    deniveleMax?: string;

    allureMin?: string;
    allureMax?: string;

    intensite?: string;

    typeEntrainement?: string;

    dureeMin?: string;
    dureeMax?: string;

    genres?: string;

    modeInscription?: string;

    masquerCompletes?: string;
  }>;
};

type SortieListe = {
  id: string;
  titre: string;
  organisateur_id: string;
  nombre_max_participants: number;
  date_heure_depart: string;
  lieu_depart: string;
  type_sortie: string;
  mode_inscription: string;
  type_entrainement: string | null;
  distance_km: number | null;
  denivele_positif_m: number | null;
  duree_estimee_minutes: number | null;
  intensite: string | null;
  allure_secondes_km: number | null;
  genres_autorises: string[];
  distance_geo_km: number;
};

function nombreParametre(valeur?: string) {
  if (!valeur) {
    return null;
  }

  const nombre = Number(valeur);

  return Number.isFinite(nombre) && nombre >= 0 ? nombre : null;
}

export default async function SortiesPage({ searchParams }: SortiesPageProps) {
  const params = await searchParams;

  // ------------------------------------------------
  // FILTRES URL
  // ------------------------------------------------

  const filtreType =
    params.type === "route" || params.type === "trail" ? params.type : "";

  const filtreDate = params.date ?? "";

  const filtreDistanceMin = nombreParametre(params.distanceMin);

  const filtreDistanceMax = nombreParametre(params.distanceMax);

  const filtreDeniveleMin = nombreParametre(params.deniveleMin);

  const filtreDeniveleMax = nombreParametre(params.deniveleMax);

  const filtreAllureMin = nombreParametre(params.allureMin);

  const filtreAllureMax = nombreParametre(params.allureMax);

  const filtreIntensite =
    params.intensite === "tranquille" ||
    params.intensite === "moderee" ||
    params.intensite === "soutenue"
      ? params.intensite
      : "";

  const TYPES_ENTRAINEMENT_VALIDES = [
    "endurance_fondamentale",
    "sortie_longue",
    "tempo_seuil",
    "fractionne",
    "cotes",
    "recuperation",
    "libre",
  ];

  const filtreTypeEntrainement =
    params.typeEntrainement &&
    TYPES_ENTRAINEMENT_VALIDES.includes(params.typeEntrainement)
      ? params.typeEntrainement
      : "";

  const filtreDureeMin = nombreParametre(params.dureeMin);

  const filtreDureeMax = nombreParametre(params.dureeMax);

  const GENRES_VALIDES = ["homme", "femme", "autre"];

  const filtreGenres = (params.genres ?? "")
    .split(",")
    .filter((genre) => GENRES_VALIDES.includes(genre));

  const filtreModeInscription =
    params.modeInscription === "automatique" ||
    params.modeInscription === "validation"
      ? params.modeInscription
      : "";

  const masquerCompletes = params.masquerCompletes === "1";

  const supabase = await createClient();

  // Utilisateur connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Vérifie que l'utilisateur possède un profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/profil");
  }
  // Localisation enregistrée dans le profil
  const { data: filtreProfilData, error: filtreProfilError } =
    await supabase.rpc("mon_filtre_geographique");

  const filtreProfil = filtreProfilData?.[0] ?? null;

  if (filtreProfilError || !filtreProfil) {
    redirect("/profil");
  }

  const filtreLieu = params.lieu ?? filtreProfil.lieu_recherche ?? "";

  // ------------------------------------------------
  // RAYON
  // ------------------------------------------------

  const rayonDemande =
    params.rayon !== undefined
      ? Number(params.rayon)
      : Number(filtreProfil.rayon_recherche_km);

  const filtreRayon = Number.isFinite(rayonDemande)
    ? Math.min(20, Math.max(1, rayonDemande))
    : 10;

  // ------------------------------------------------
  // COORDONNÉES
  // ------------------------------------------------

  const latitudeParam = params.lat !== undefined ? Number(params.lat) : NaN;

  const longitudeParam = params.lon !== undefined ? Number(params.lon) : NaN;

  const latitude = Number.isFinite(latitudeParam)
    ? latitudeParam
    : Number(filtreProfil.latitude);

  const longitude = Number.isFinite(longitudeParam)
    ? longitudeParam
    : Number(filtreProfil.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    redirect("/profil");
  }

  const aujourdHui = getDateKey(new Date());

  const dateFiltreValide =
    /^\d{4}-\d{2}-\d{2}$/.test(filtreDate) && filtreDate >= aujourdHui;

  // ------------------------------------------------
  // RECHERCHE DES SORTIES
  // ------------------------------------------------

  let sortiesQuery = supabase.rpc("sorties_dans_rayon", {
    p_latitude: latitude,
    p_longitude: longitude,
    p_rayon_km: filtreRayon,
  });

  // Type : Trail ou Route
  if (filtreType === "route" || filtreType === "trail") {
    sortiesQuery = sortiesQuery.eq("type_sortie", filtreType);
  }
  // ------------------------------------------------
  // DISTANCE
  // ------------------------------------------------

  if (filtreDistanceMin !== null) {
    sortiesQuery = sortiesQuery.gte("distance_km", filtreDistanceMin);
  }

  if (filtreDistanceMax !== null) {
    sortiesQuery = sortiesQuery.lte("distance_km", filtreDistanceMax);
  }

  // ------------------------------------------------
  // INTENSITÉ
  // ------------------------------------------------

  if (filtreIntensite) {
    sortiesQuery = sortiesQuery.eq("intensite", filtreIntensite);
  }

  // ------------------------------------------------
  // TYPE D'ENTRAÎNEMENT
  // ------------------------------------------------

  if (filtreTypeEntrainement) {
    sortiesQuery = sortiesQuery.eq("type_entrainement", filtreTypeEntrainement);
  }

  // ------------------------------------------------
  // DURÉE ESTIMÉE
  // ------------------------------------------------

  if (filtreDureeMin !== null) {
    sortiesQuery = sortiesQuery.gte("duree_estimee_minutes", filtreDureeMin);
  }

  if (filtreDureeMax !== null) {
    sortiesQuery = sortiesQuery.lte("duree_estimee_minutes", filtreDureeMax);
  }

  // ------------------------------------------------
  // GENRES AUTORISÉS
  // ------------------------------------------------

  if (filtreGenres.length > 0) {
    sortiesQuery = sortiesQuery.contains("genres_autorises", filtreGenres);
  }

  // ------------------------------------------------
  // MODE D'INSCRIPTION
  // ------------------------------------------------

  if (filtreModeInscription) {
    sortiesQuery = sortiesQuery.eq("mode_inscription", filtreModeInscription);
  }

  // ------------------------------------------------
  // ROUTE : ALLURE
  // ------------------------------------------------

  if (filtreType === "route") {
    if (filtreAllureMin !== null) {
      sortiesQuery = sortiesQuery.gte("allure_secondes_km", filtreAllureMin);
    }

    if (filtreAllureMax !== null) {
      sortiesQuery = sortiesQuery.lte("allure_secondes_km", filtreAllureMax);
    }
  }

  // ------------------------------------------------
  // TRAIL : DÉNIVELÉ
  // ------------------------------------------------

  if (filtreType === "trail") {
    if (filtreDeniveleMin !== null) {
      sortiesQuery = sortiesQuery.gte("denivele_positif_m", filtreDeniveleMin);
    }

    if (filtreDeniveleMax !== null) {
      sortiesQuery = sortiesQuery.lte("denivele_positif_m", filtreDeniveleMax);
    }
  }

  // Si une date valide est choisie
  if (dateFiltreValide) {
    // On charge aussi le jour précédent,
    // pour qu'il puisse apparaître à gauche
    // de la date sélectionnée.
    const jourPrecedent = ajouterJours(filtreDate, -1);

    const dateRechercheDebut =
      jourPrecedent < aujourdHui ? aujourdHui : jourPrecedent;

    sortiesQuery = sortiesQuery.gte("date_heure_depart", dateRechercheDebut);
  } else {
    // Sinon, uniquement les sorties futures
    sortiesQuery = sortiesQuery.gte(
      "date_heure_depart",
      new Date().toISOString(),
    );
  }

  // Plus proche dans le temps en premier
  sortiesQuery = sortiesQuery.order("date_heure_depart", { ascending: true });

  const { data: sorties, error: sortiesError } = await sortiesQuery;

  const listeSortiesBrutes = (sorties ?? []) as SortieListe[];

  const idsSorties = listeSortiesBrutes.map((sortie) => sortie.id);

  const idsOrganisateurs = [
    ...new Set(listeSortiesBrutes.map((sortie) => sortie.organisateur_id)),
  ];
  // ------------------------------------------------
  // PARTICIPATIONS
  // ------------------------------------------------

  let participations: {
    sortie_id: string;
    utilisateur_id: string;
  }[] = [];

  let participationsError = null;

  if (idsSorties.length > 0) {
    const { data, error } = await supabase
      .from("participations")
      .select("sortie_id, utilisateur_id")
      .in("sortie_id", idsSorties);

    participations = data ?? [];

    participationsError = error;
  }

  // ------------------------------------------------
  // PROFILS
  // ------------------------------------------------

  let profils: {
    id: string;
    nom: string;
  }[] = [];

  let profilsError = null;

  if (idsOrganisateurs.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nom")
      .in("id", idsOrganisateurs);

    profils = data ?? [];

    profilsError = error;
  }

  if (sortiesError || participationsError || profilsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des sorties.</p>
      </main>
    );
  }

  const listeParticipations = participations;

  const listeProfils = profils;

  const nombreParticipantsParSortie = new Map<string, number>();

  for (const participation of listeParticipations) {
    const nombreActuel =
      nombreParticipantsParSortie.get(participation.sortie_id) ?? 0;

    nombreParticipantsParSortie.set(participation.sortie_id, nombreActuel + 1);
  }

  const listeSorties = masquerCompletes
    ? listeSortiesBrutes.filter((sortie) => {
        const nombreActuel =
          1 + (nombreParticipantsParSortie.get(sortie.id) ?? 0);

        return nombreActuel < sortie.nombre_max_participants;
      })
    : listeSortiesBrutes;

  const profilsParId = new Map(
    listeProfils.map((profil) => [profil.id, profil]),
  );
  // ------------------------------------------------
  // REGROUPEMENT DES SORTIES PAR JOUR
  // ------------------------------------------------

  const sortiesParJour = new Map<string, SortieListe[]>();

  for (const sortie of listeSorties) {
    const dateKey = getDateKey(new Date(sortie.date_heure_depart));

    const groupe = sortiesParJour.get(dateKey) ?? [];

    groupe.push(sortie);

    sortiesParJour.set(dateKey, groupe);
  }

  // ------------------------------------------------
  // BARRE AUJOURD'HUI → J+7
  // ------------------------------------------------

  const dateNavigationDemandee = dateFiltreValide
    ? ajouterJours(filtreDate, -1)
    : aujourdHui;

  const dateDebutNavigation =
    dateNavigationDemandee < aujourdHui ? aujourdHui : dateNavigationDemandee;

  // ------------------------------------------------
  // 7 JOURS AFFICHÉS
  // ------------------------------------------------

  const joursNavigation = Array.from({ length: 7 }, (_, index) => {
    const date = ajouterJours(dateDebutNavigation, index);

    return {
      date,
      disponible: sortiesParJour.has(date),
    };
  });

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main
      className="
        mx-auto
        flex
        h-[calc(100dvh-4rem)]
        max-w-2xl
        flex-col
        overflow-hidden
        p-6
    "
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Les sorties</h1>
      </div>

      {/* FILTRES REPLIABLES */}

      <FiltresSorties
        lieuActuel={filtreLieu}
        rayonActuel={filtreRayon}
        typeActuel={filtreType}
      />

      {/* Navigation des jours */}
      <NavigationJours
        jours={joursNavigation}
        dateInitiale={dateFiltreValide ? filtreDate : aujourdHui}
      />

      <div className="flex min-h-0 flex-1">
        {/* LISTE SCROLLABLE */}

        <div
          id="liste-sorties-scroll"
          className="
            min-h-0
            flex-1
            overflow-y-auto
            pr-2
        "
        >
          {listeSorties.length === 0 ? (
            <p>Aucune sortie ne correspond à votre recherche.</p>
          ) : (
            <div className="space-y-10">
              {Array.from(sortiesParJour.entries()).map(
                ([date, sortiesJour]) => (
                  <section
                    key={date}
                    id={`jour-${date}`}
                    data-jour-sorties={date}
                    className="scroll-mt-6"
                  >
                    {/* TITRE DU JOUR */}

                    <h2 className="border-b pb-2 text-xl font-semibold">
                      {date === aujourdHui
                        ? `Aujourd'hui — ${formatDateLongue(date)}`
                        : date === ajouterJours(aujourdHui, 1)
                          ? `Demain — ${formatDateLongue(date)}`
                          : formatDateLongue(date)}
                    </h2>

                    {/* SORTIES DU JOUR */}

                    <div>
                      {sortiesJour.map((sortie) => {
                        const organisateur = profilsParId.get(
                          sortie.organisateur_id,
                        );

                        const nombreActuel =
                          1 + (nombreParticipantsParSortie.get(sortie.id) ?? 0);

                        const distanceAffichee =
                          sortie.distance_km !== null
                            ? `${Number(sortie.distance_km).toLocaleString(
                                "fr-FR",
                                {
                                  maximumFractionDigits: 2,
                                },
                              )} km`
                            : null;

                        const intensiteAffichee = afficherIntensite(
                          sortie.intensite,
                        );

                        const allureAffichee =
                          sortie.allure_secondes_km !== null
                            ? afficherAllure(sortie.allure_secondes_km)
                            : null;

                        const infosSportives =
                          sortie.type_sortie === "trail"
                            ? [
                                distanceAffichee,
                                sortie.denivele_positif_m !== null
                                  ? `${sortie.denivele_positif_m} m D+`
                                  : null,
                                intensiteAffichee,
                              ]
                                .filter(Boolean)
                                .join(" • ")
                            : [
                                distanceAffichee,
                                allureAffichee,
                                intensiteAffichee,
                              ]
                                .filter(Boolean)
                                .join(" • ");

                        const modeInscriptionAffiche =
                          sortie.mode_inscription === "validation"
                            ? "Sur acceptation"
                            : "Validation automatique";

                        const heureAffichee = formatHeure(
                          sortie.date_heure_depart,
                        );

                        const [heureDepart, minuteDepart] = heureAffichee
                          .split(":")
                          .map(Number);

                        const minuteJour = heureDepart * 60 + minuteDepart;

                        return (
                          <Link
                            key={sortie.id}
                            href={`/sorties/${sortie.id}`}
                            data-minute-depart={minuteJour}
                            className="
                                            flex
                                            items-center
                                            gap-4
                                            border-b
                                            py-2
                                            hover:opacity-70
                                        "
                          >
                            {/* HEURE */}

                            <div className="w-14 shrink-0 self-start pt-1">
                              <p className="font-semibold leading-none">
                                {heureAffichee}
                              </p>
                            </div>

                            {/* INFORMATIONS DE LA SORTIE */}

                            <div className="min-w-0 flex-1">
                              {/* TITRE + ROUTE/TRAIL */}

                              <div className="flex items-baseline gap-2">
                                <h3 className="truncate font-semibold">
                                  {sortie.titre}
                                </h3>

                                <span className="shrink-0 text-sm text-gray-500">
                                  {sortie.type_sortie === "trail"
                                    ? "Trail"
                                    : "Route"}
                                </span>
                              </div>

                              {/* DONNÉES SPORTIVES */}

                              <p className="mt-1 truncate text-sm text-gray-500">
                                {infosSportives}
                              </p>

                              {/* ORGANISATEUR */}

                              <p className="mt-1 truncate text-xs text-gray-500">
                                {organisateur?.nom ?? "Organisateur"}
                              </p>
                            </div>

                            {/* PARTICIPANTS + INSCRIPTION */}

                            <div
                              className="
        shrink-0
        self-start
        text-right
    "
                            >
                              <p className="font-medium leading-none">
                                {nombreActuel} /{" "}
                                {sortie.nombre_max_participants}
                              </p>

                              <p className="mt-2 text-xs text-gray-500">
                                {modeInscriptionAffiche}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ),
              )}
            </div>
          )}
        </div>

        {/* NAVIGATION HORAIRE */}

        <NavigationHeures />
      </div>
    </main>
  );
}
