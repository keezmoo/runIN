import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import GererDemandeButtons from "./gerer-demande-buttons";
import ParticiperButton from "../participer-button";
import RetirerParticipantButton from "./retirer-participant-button";
import SupprimerSortieButton from "../../mes-sorties/supprimer-sortie-button";
import AnnulerSortieButton from "../../mes-sorties/annuler-sortie-button";
import {
  afficherAllure,
  afficherDuree,
  afficherIntensite,
  afficherTypeEntrainement,
} from "@/lib/sortie-utils";
import ContacterOrganisateurButton from "./contacter-organisateur-button";
import { formatDateLongue, formatHeure, getDateKey } from "@/lib/date-utils";
import ContacterParticipantButton from "./contacter-participant-button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetailSortiePage({ params }: PageProps) {
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

  const { data: profilUtilisateur, error: profilUtilisateurError } =
    await supabase.from("profiles").select("sexe").eq("id", user.id).single();

  if (profilUtilisateurError || !profilUtilisateur) {
    redirect("/profil");
  }

  // ------------------------------------------------
  // SORTIE
  // ------------------------------------------------

  const { data: sortie, error: sortieError } = await supabase
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
    description,
    genres_autorises,
    statut
`,
    )
    .eq("id", id)
    .maybeSingle();

  if (sortieError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la sortie.</p>
      </main>
    );
  }

  if (!sortie) {
    notFound();
  }
  const genreUtilisateurAutorise = sortie.genres_autorises.includes(
    profilUtilisateur.sexe,
  );
  // ------------------------------------------------
  // PARTICIPATIONS
  // ------------------------------------------------

  const { data: participations, error: participationsError } = await supabase
    .from("participations")
    .select("utilisateur_id")
    .eq("sortie_id", sortie.id);

  if (participationsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des participants.</p>
      </main>
    );
  }

  const listeParticipations = participations ?? [];

  // ------------------------------------------------
  // INTERACTIONS AVEC LA SORTIE
  // ------------------------------------------------

  const { count: nombreDemandesInteraction, error: demandesInteractionError } =
    await supabase
      .from("demandes_participation")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("sortie_id", sortie.id);

  const {
    count: nombreConversationsInteraction,
    error: conversationsInteractionError,
  } = await supabase
    .from("conversations_sortie")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("sortie_id", sortie.id);

  const aDesInteractions =
    listeParticipations.length > 0 ||
    (nombreDemandesInteraction ?? 0) > 0 ||
    (nombreConversationsInteraction ?? 0) > 0 ||
    Boolean(demandesInteractionError || conversationsInteractionError);

  // ------------------------------------------------
  // DEMANDE DE PARTICIPATION DE L'UTILISATEUR
  // ------------------------------------------------

  const { data: demandeParticipation, error: demandeParticipationError } =
    await supabase
      .from("demandes_participation")
      .select("id")
      .eq("sortie_id", sortie.id)
      .eq("utilisateur_id", user.id)
      .eq("statut", "en_attente")
      .maybeSingle();

  if (demandeParticipationError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la demande.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // NOMBRE DE DEMANDES EN ATTENTE
  // ------------------------------------------------

  const { data: nombreDemandesEnAttente, error: nombreDemandesEnAttenteError } =
    await supabase.rpc("nombre_demandes_en_attente_sortie", {
      p_sortie_id: sortie.id,
    });

  if (nombreDemandesEnAttenteError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des demandes en attente.</p>
      </main>
    );
  }

  const totalDemandesEnAttente = nombreDemandesEnAttente ?? 0;

  // ------------------------------------------------
  // UTILISATEUR RETIRÉ PAR L'ORGANISATEUR ?
  // ------------------------------------------------

  const { data: exclusionSortie, error: exclusionSortieError } = await supabase
    .from("exclusions_sortie")
    .select("sortie_id")
    .eq("sortie_id", sortie.id)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (exclusionSortieError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la participation.</p>
      </main>
    );
  }

  const estExcluDeLaSortie = Boolean(exclusionSortie);

  // ------------------------------------------------
  // PROFILS
  // ------------------------------------------------

  // L'organisateur compte comme premier participant,
  // même s'il n'est pas dans la table participations.

  const idsProfils = [
    sortie.organisateur_id,
    ...listeParticipations.map((participation) => participation.utilisateur_id),
  ];

  // Évite les doublons éventuels.
  const idsProfilsUniques = [...new Set(idsProfils)];

  const { data: profils, error: profilsError } = await supabase
    .from("profiles")
    .select("id, nom, age, sexe")
    .in("id", idsProfilsUniques);

  if (profilsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des profils.</p>
      </main>
    );
  }

  const listeProfils = profils ?? [];

  const organisateur =
    listeProfils.find((profil) => profil.id === sortie.organisateur_id) ?? null;

  // ------------------------------------------------
  // ÉTAT DE LA PARTICIPATION
  // ------------------------------------------------

  const nombreActuel = 1 + listeParticipations.length;

  const dejaParticipant = listeParticipations.some(
    (participation) => participation.utilisateur_id === user.id,
  );

  const estOrganisateur = sortie.organisateur_id === user.id;

  // ------------------------------------------------
  // DEMANDES REÇUES PAR L'ORGANISATEUR
  // ------------------------------------------------

  let demandesRecues: {
    id: string;
    utilisateur_id: string;
  }[] = [];

  if (estOrganisateur) {
    const { data, error } = await supabase
      .from("demandes_participation")
      .select("id, utilisateur_id")
      .eq("sortie_id", sortie.id)
      .eq("statut", "en_attente")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      return (
        <main className="mx-auto max-w-2xl p-6">
          <p>Erreur lors du chargement des demandes.</p>
        </main>
      );
    }

    demandesRecues = data ?? [];
  }

  // ------------------------------------------------
  // PROFILS DES PERSONNES AYANT FAIT UNE DEMANDE
  // ------------------------------------------------

  let profilsDemandes: {
    id: string;
    nom: string;
    age: number;
  }[] = [];

  if (demandesRecues.length > 0) {
    const idsDemandes = demandesRecues.map((demande) => demande.utilisateur_id);

    const { data, error: profilsDemandesError } = await supabase
      .from("profiles")
      .select("id, nom, age")
      .in("id", idsDemandes);

    if (profilsDemandesError) {
      return (
        <main className="mx-auto max-w-2xl p-6">
          <p>Erreur lors du chargement des profils.</p>
        </main>
      );
    }

    profilsDemandes = data ?? [];
  }

  // ------------------------------------------------
  // SORTIE COMPLÈTE ?
  // ------------------------------------------------

  const complet = nombreActuel >= sortie.nombre_max_participants;

  const nombrePlacesDisponibles = Math.max(
    0,
    sortie.nombre_max_participants - nombreActuel,
  );

  const sortiePassee =
    new Date(sortie.date_heure_depart).getTime() <= Date.now();
  // ------------------------------------------------
  // DATE
  // ------------------------------------------------

  const dateKey = getDateKey(new Date(sortie.date_heure_depart));

  const typeEntrainementAffiche = afficherTypeEntrainement(
    sortie.type_entrainement,
  );

  const intensiteAffiche = afficherIntensite(sortie.intensite);

  const genresAutorisesAffiches =
    sortie.genres_autorises.length === 3
      ? "Tout le monde"
      : sortie.genres_autorises
          .map((genre: "homme" | "femme" | "autre") => {
            if (genre === "femme") {
              return "Femmes";
            }

            if (genre === "homme") {
              return "Hommes";
            }

            return "Autre";
          })
          .join(", ");

  const caracteristiques: {
    label: string;
    valeur: string;
  }[] = [];

  if (sortie.distance_km !== null) {
    caracteristiques.push({
      label: "Distance",
      valeur: `${Number(sortie.distance_km).toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      })} km`,
    });
  }

  if (sortie.denivele_positif_m !== null) {
    caracteristiques.push({
      label: "D+",
      valeur: `${sortie.denivele_positif_m} m`,
    });
  }

  if (sortie.allure_secondes_km !== null) {
    caracteristiques.push({
      label: "Allure",
      valeur: afficherAllure(sortie.allure_secondes_km),
    });
  }

  if (intensiteAffiche) {
    caracteristiques.push({
      label: "Intensité",
      valeur: intensiteAffiche,
    });
  }

  if (sortie.duree_estimee_minutes !== null) {
    caracteristiques.push({
      label: "Durée totale",
      valeur: afficherDuree(sortie.duree_estimee_minutes),
    });
  }

  // ------------------------------------------------
  // peut contacter l'organisateur
  // ------------------------------------------------

  const peutContacterOrganisateur =
    !estOrganisateur &&
    sortie.statut === "planifiee" &&
    new Date(sortie.date_heure_depart).getTime() > Date.now();

  const peutContacterParticipants =
    estOrganisateur &&
    sortie.statut === "planifiee" &&
    new Date(sortie.date_heure_depart).getTime() > Date.now();

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6 pb-32">
      {/* EN-TÊTE DE LA SORTIE */}

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-sm font-medium">
            {sortie.type_sortie === "trail" ? "Trail" : "Route"}
          </span>

          {sortie.statut === "annulee" && (
            <span className="rounded-full border px-3 py-1 text-sm font-semibold">
              Sortie annulée
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold">{sortie.titre}</h1>

          {estOrganisateur &&
            sortie.statut === "planifiee" &&
            !sortiePassee && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/sorties/${sortie.id}/modifier`}
                  className="rounded border px-4 py-2"
                >
                  Modifier
                </Link>

                {aDesInteractions ? (
                  <AnnulerSortieButton
                    sortieId={sortie.id}
                    titre={sortie.titre}
                  />
                ) : (
                  <SupprimerSortieButton
                    sortieId={sortie.id}
                    titre={sortie.titre}
                  />
                )}
              </div>
            )}
        </div>

        {/* ORGANISATEUR */}

        {organisateur && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Organisée par{" "}
              <Link
                href={`/membres/${organisateur.id}`}
                className="font-medium text-gray-300 hover:underline"
              >
                {organisateur.nom}
              </Link>
            </p>
          </div>
        )}

        {/* DATE + LIEU */}

        <div className="mt-5 grid gap-4 rounded border p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Date et heure</p>

            <p className="mt-1 font-medium">
              {formatDateLongue(dateKey)}
              {" à "}
              {formatHeure(sortie.date_heure_depart)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Lieu de départ</p>

            <p className="mt-1 font-medium">{sortie.lieu_depart}</p>
          </div>
        </div>
      </header>

      {/* CARTE
    Elle viendra ici lorsque nous traiterons
    la localisation / carte interactive.
*/}

      {/* TYPE D'ENTRAÎNEMENT */}

      {typeEntrainementAffiche && (
        <section className="mb-5">
          <p className="text-sm text-gray-500">Type d&apos;entraînement</p>

          <p className="mt-1 text-lg font-semibold">
            {typeEntrainementAffiche}
          </p>
        </section>
      )}

      {/* PARTICIPANTS AUTORISÉS */}
      <div>
        <p className="text-sm text-gray-500">Participants autorisés</p>

        <p>{genresAutorisesAffiches}</p>
      </div>

      {/* CARACTÉRISTIQUES */}

      <section className="mb-8">
        <div className="overflow-x-auto rounded border">
          <table className="w-full min-w-max text-center">
            <thead className="border-b">
              <tr>
                {caracteristiques.map((caracteristique) => (
                  <th
                    key={caracteristique.label}
                    className="px-4 py-3 text-sm font-normal text-gray-500"
                  >
                    {caracteristique.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                {caracteristiques.map((caracteristique) => (
                  <td
                    key={caracteristique.label}
                    className="px-4 py-4 font-semibold"
                  >
                    {caracteristique.valeur}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {sortie.description && sortie.description.trim() !== "" && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Description</h2>

          <p className="whitespace-pre-wrap">{sortie.description}</p>
        </section>
      )}

      {/*            


            {/* DEMANDES DE PARTICIPATION */}

      {sortie.statut === "planifiee" &&
        estOrganisateur &&
        demandesRecues.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">
              Demandes de participation ({totalDemandesEnAttente})
            </h2>

            <div className="space-y-3">
              {demandesRecues.map((demande) => {
                const profil = profilsDemandes.find(
                  (profil) => profil.id === demande.utilisateur_id,
                );

                if (!profil) {
                  return null;
                }

                return (
                  <div key={demande.id} className="rounded border p-4">
                    <Link href={`/membres/${profil.id}`} className="font-medium">
                      {profil.nom}
                    </Link>

                    <p className="mb-3 text-sm text-gray-500">
                      {profil.age} ans
                    </p>

                    <GererDemandeButtons
                      demandeId={demande.id}
                      sortieId={sortie.id}
                      utilisateurId={profil.id}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {/* PARTICIPANTS */}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Participants</h2>

        <div className="space-y-2">
          {idsProfilsUniques.map((profilId) => {
            const profil = listeProfils.find((item) => item.id === profilId);

            if (!profil) {
              return null;
            }

            const estOrganisateurListe = profil.id === sortie.organisateur_id;

            return (
              <div
                key={profil.id}
                className="
                            flex
                            items-center
                            justify-between
                            gap-3
                            rounded
                            border
                            p-3
                        "
              >
                {/* PROFIL DU PARTICIPANT */}

                <Link
                  href={`/membres/${profil.id}`}
                  className="
                                flex-1
                                hover:opacity-70
                            "
                >
                  <p className="font-medium">{profil.nom}</p>

                  <p className="text-sm text-gray-500">{profil.age} ans</p>
                </Link>

                {/* ORGANISATEUR */}

                {estOrganisateurListe && (
                  <span className="text-sm text-gray-500">Organisateur</span>
                )}

                {!estOrganisateurListe && peutContacterParticipants && (
                  <div className="flex gap-2">
                    <ContacterParticipantButton
                      sortieId={sortie.id}
                      utilisateurId={profil.id}
                    />

                    <RetirerParticipantButton
                      sortieId={sortie.id}
                      utilisateurId={profil.id}
                      nomParticipant={profil.nom}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* DEMANDE DE PARTICIPATION EN ATTENTE */}

      {demandeParticipation &&
        sortie.mode_inscription === "validation" &&
        sortie.statut === "planifiee" &&
        !sortiePassee && (
          <section className="mb-8 rounded border p-4">
            <p className="font-medium">Votre demande est en attente.</p>

            {complet ? (
              <p className="mt-2 text-sm text-gray-500">
                La sortie est actuellement complète. Votre demande reste active
                si une place se libère.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                {nombrePlacesDisponibles}{" "}
                {nombrePlacesDisponibles === 1
                  ? "place disponible"
                  : "places disponibles"}
                .
              </p>
            )}

            <p className="mt-1 text-sm text-gray-500">
              {totalDemandesEnAttente}{" "}
              {totalDemandesEnAttente === 1
                ? "demande en attente."
                : "demandes en attente."}
            </p>
          </section>
        )}

      {/* PARTICIPATION */}

      {/* BANDEAU D'ACTION FIXE */}

      <div
        className="
        fixed
        inset-x-0
        bottom-0
        z-50
        border-t
       bg-black
text-white
        shadow-lg
    "
      >
        <div
          className="
            mx-auto
            flex
            max-w-2xl
            items-center
            justify-between
            gap-4
            px-4
            py-3
        "
        >
          {/* NOMBRE DE PARTICIPANTS */}

          <div className="shrink-0">
            <p className="text-sm text-gray-300">Participants</p>

            <p className="font-semibold">
              {nombreActuel} / {sortie.nombre_max_participants}
            </p>
          </div>

          {/* ACTIONS */}

          <div className="flex flex-1 items-center justify-end gap-2">
            {sortie.statut === "annulee" ? (
              <span className="font-medium text-gray-500">Sortie annulée</span>
            ) : sortiePassee ? (
              <span className="font-medium text-gray-500">Sortie terminée</span>
            ) : estExcluDeLaSortie ? (
              <span className="font-medium text-red-500">
                Participation impossible
              </span>
            ) : (
              <>
                {peutContacterOrganisateur && (
                  <ContacterOrganisateurButton sortieId={sortie.id} />
                )}

                <ParticiperButton
                  sortieId={sortie.id}
                  userId={user.id}
                  nombreMax={sortie.nombre_max_participants}
                  dejaParticipant={dejaParticipant}
                  estOrganisateur={estOrganisateur}
                  complet={complet}
                  modeInscription={sortie.mode_inscription}
                  demandeEnAttente={Boolean(demandeParticipation)}
                  genreAutorise={genreUtilisateurAutorise}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
