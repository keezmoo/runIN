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
import CarteSortie from "./carte-sortie";
import SignalerButton from "@/components/signaler-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  const [
    profilUtilisateurResultat,
    sortieResultat,
    utilisateursIndisponiblesResultat,
  ] = await Promise.all([
    supabase.from("profiles").select("sexe").eq("id", user.id).single(),

    supabase
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
      .maybeSingle(),

    supabase.rpc("mes_utilisateurs_indisponibles"),
  ]);

  const { data: profilUtilisateur, error: profilUtilisateurError } =
    profilUtilisateurResultat;

  if (profilUtilisateurError || !profilUtilisateur) {
    redirect("/profil");
  }

  const { data: sortie, error: sortieError } = sortieResultat;

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

  const {
    data: utilisateursIndisponiblesData,
    error: utilisateursIndisponiblesError,
  } = utilisateursIndisponiblesResultat;

  if (utilisateursIndisponiblesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la sortie.</p>
      </main>
    );
  }

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesData ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  // Une sortie organisée par une personne
  // indisponible ne doit pas être accessible.

  if (
    sortie.organisateur_id !== user.id &&
    idsIndisponibles.has(sortie.organisateur_id)
  ) {
    notFound();
  }

  const genreUtilisateurAutorise = sortie.genres_autorises.includes(
    profilUtilisateur.sexe,
  );

  const estOrganisateur = sortie.organisateur_id === user.id;

  // ------------------------------------------------
  // DONNÉES LIÉES À LA SORTIE
  // Chargées en parallèle pour éviter les allers-retours séquentiels.
  // ------------------------------------------------

  const demandesRecuesPromise = estOrganisateur
    ? supabase
        .from("demandes_participation")
        .select("id, utilisateur_id")
        .eq("sortie_id", sortie.id)
        .eq("statut", "en_attente")
        .order("created_at", {
          ascending: true,
        })
    : Promise.resolve({
        data: [] as {
          id: string;
          utilisateur_id: string;
        }[],
        error: null,
      });

  const [
    { data: coordonneesData, error: coordonneesError },
    { data: participations, error: participationsError },
    { count: nombreDemandesInteraction, error: demandesInteractionError },
    {
      count: nombreConversationsInteraction,
      error: conversationsInteractionError,
    },
    { data: demandeParticipation, error: demandeParticipationError },
    { data: nombreDemandesEnAttente, error: nombreDemandesEnAttenteError },
    { data: exclusionSortie, error: exclusionSortieError },
    { data: demandesRecuesData, error: demandesRecuesError },
  ] = await Promise.all([
    supabase.rpc("coordonnees_sortie", {
      p_sortie_id: sortie.id,
    }),

    supabase
      .from("participations")
      .select("utilisateur_id")
      .eq("sortie_id", sortie.id),

    supabase
      .from("demandes_participation")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("sortie_id", sortie.id),

    supabase
      .from("conversations_sortie")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("sortie_id", sortie.id),

    supabase
      .from("demandes_participation")
      .select("id")
      .eq("sortie_id", sortie.id)
      .eq("utilisateur_id", user.id)
      .eq("statut", "en_attente")
      .maybeSingle(),

    supabase.rpc("nombre_demandes_en_attente_sortie", {
      p_sortie_id: sortie.id,
    }),

    supabase
      .from("exclusions_sortie")
      .select("sortie_id")
      .eq("sortie_id", sortie.id)
      .eq("utilisateur_id", user.id)
      .maybeSingle(),

    demandesRecuesPromise,
  ]);

  if (coordonneesError) {
    console.error("Erreur chargement coordonnées :", coordonneesError);
  }

  if (participationsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des participants.</p>
      </main>
    );
  }

  if (demandeParticipationError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la demande.</p>
      </main>
    );
  }

  if (nombreDemandesEnAttenteError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des demandes en attente.</p>
      </main>
    );
  }

  if (exclusionSortieError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement de la participation.</p>
      </main>
    );
  }

  if (demandesRecuesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des demandes.</p>
      </main>
    );
  }

  const coordonnees = coordonneesData?.[0] ?? null;

  const latitude = coordonnees ? Number(coordonnees.latitude) : NaN;
  const longitude = coordonnees ? Number(coordonnees.longitude) : NaN;

  const coordonneesValides =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const listeParticipations = participations ?? [];

  const aDesInteractions =
    listeParticipations.length > 0 ||
    (nombreDemandesInteraction ?? 0) > 0 ||
    (nombreConversationsInteraction ?? 0) > 0 ||
    Boolean(demandesInteractionError || conversationsInteractionError);

  const totalDemandesEnAttente = nombreDemandesEnAttente ?? 0;

  const estExcluDeLaSortie = Boolean(exclusionSortie);

  const demandesRecues = demandesRecuesData ?? [];

  // ------------------------------------------------
  // PROFILS
  // ------------------------------------------------

  // L'organisateur compte comme premier participant,
  // même s'il n'est pas dans la table participations.
  const idsProfils = [
    sortie.organisateur_id,
    ...listeParticipations.map((participation) => participation.utilisateur_id),
  ];

  const idsProfilsUniques = [...new Set(idsProfils)];

  const idsProfilsACharger = idsProfilsUniques.filter(
    (profilId) => profilId === user.id || !idsIndisponibles.has(profilId),
  );

  const idsDemandes = demandesRecues
    .map((demande) => demande.utilisateur_id)
    .filter((utilisateurId) => !idsIndisponibles.has(utilisateurId));

  const profilsDemandesPromise =
    idsDemandes.length > 0
      ? supabase.from("profiles").select("id, nom, age").in("id", idsDemandes)
      : Promise.resolve({
          data: [] as {
            id: string;
            nom: string;
            age: number;
          }[],
          error: null,
        });

  const [
    { data: profils, error: profilsError },
    { data: profilsDemandesData, error: profilsDemandesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nom, age, sexe")
      .in("id", idsProfilsACharger),

    profilsDemandesPromise,
  ]);

  if (profilsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des profils.</p>
      </main>
    );
  }

  if (profilsDemandesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des profils.</p>
      </main>
    );
  }

  const listeProfils = profils ?? [];

  const profilsDemandes = profilsDemandesData ?? [];

  const organisateur =
    listeProfils.find((profil) => profil.id === sortie.organisateur_id) ?? null;

  // ------------------------------------------------
  // ÉTAT DE LA PARTICIPATION
  // ------------------------------------------------

  const nombreActuel = 1 + listeParticipations.length;

  const dejaParticipant = listeParticipations.some(
    (participation) => participation.utilisateur_id === user.id,
  );
  // ------------------------------------------------
  // SORTIE COMPLÈTE ?
  // ------------------------------------------------

  const complet = nombreActuel >= sortie.nombre_max_participants;

  const nombrePlacesDisponibles = Math.max(
    0,
    sortie.nombre_max_participants - nombreActuel,
  );

  // Heure serveur volontairement évaluée une seule fois pour cette requête.
  const maintenant = Date.now(); // eslint-disable-line react-hooks/purity

  const sortiePassee =
    new Date(sortie.date_heure_depart).getTime() <= maintenant;
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
    new Date(sortie.date_heure_depart).getTime() > maintenant;

  const peutContacterParticipants =
    estOrganisateur &&
    sortie.statut === "planifiee" &&
    new Date(sortie.date_heure_depart).getTime() > maintenant;

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6 pb-32">
      {/* EN-TÊTE DE LA SORTIE */}

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {sortie.type_sortie === "trail" ? "Trail" : "Route"}
          </Badge>

          {sortie.statut === "annulee" && (
            <Badge variant="destructive">Sortie annulée</Badge>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold">{sortie.titre}</h1>

          {estOrganisateur &&
            sortie.statut === "planifiee" &&
            !sortiePassee && (
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline">
                  <Link href={`/sorties/${sortie.id}/modifier`}>Modifier</Link>
                </Button>

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
            <p className="text-sm text-muted-foreground">
              Organisée par{" "}
              <Link
                href={`/membres/${organisateur.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {organisateur.nom}
              </Link>
            </p>
          </div>
        )}

        {/* DATE + LIEU */}

        <Card className="mt-5 grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Date et heure</p>

            <p className="mt-1 font-medium">
              {formatDateLongue(dateKey)}
              {" à "}
              {formatHeure(sortie.date_heure_depart)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Lieu de départ</p>

            <p className="mt-1 font-medium">{sortie.lieu_depart}</p>
          </div>
        </Card>
      </header>

      {/* CARTE */}

      {coordonneesValides && (
        <section className="mb-8">
          <CarteSortie
            latitude={latitude}
            longitude={longitude}
            lieu={sortie.lieu_depart}
          />
        </section>
      )}

      {/* TYPE D'ENTRAÎNEMENT */}

      {typeEntrainementAffiche && (
        <section className="mb-5">
          <p className="text-sm text-muted-foreground">
            Type d&apos;entraînement
          </p>

          <p className="mt-1 text-lg font-semibold">
            {typeEntrainementAffiche}
          </p>
        </section>
      )}

      {/* PARTICIPANTS AUTORISÉS */}
      <div>
        <p className="text-sm text-muted-foreground">Participants autorisés</p>

        <p>{genresAutorisesAffiches}</p>
      </div>

      {/* CARACTÉRISTIQUES */}

      <section className="mb-8">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-max text-center">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {caracteristiques.map((caracteristique) => (
                  <th
                    key={caracteristique.label}
                    className="px-4 py-3 text-sm font-normal text-muted-foreground"
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
        </Card>
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
                if (idsIndisponibles.has(demande.utilisateur_id)) {
                  return (
                    <Card key={demande.id} className="p-4">
                      <p className="font-medium text-muted-foreground">
                        Profil indisponible
                      </p>
                    </Card>
                  );
                }

                const profil = profilsDemandes.find(
                  (profil) => profil.id === demande.utilisateur_id,
                );

                if (!profil) {
                  return null;
                }

                return (
                  <Card key={demande.id} className="p-4">
                    <Link
                      href={`/membres/${profil.id}`}
                      className="font-medium"
                    >
                      {profil.nom}
                    </Link>

                    <p className="mb-3 text-sm text-muted-foreground">
                      {profil.age} ans
                    </p>

                    <GererDemandeButtons
                      demandeId={demande.id}
                      sortieId={sortie.id}
                      utilisateurId={profil.id}
                    />
                  </Card>
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
            const profilIndisponible =
              profilId !== user.id && idsIndisponibles.has(profilId);

            if (profilIndisponible) {
              return (
                <Card key={profilId} className="p-4">
                  <div>
                    <p className="font-medium text-muted-foreground">
                      Profil indisponible
                    </p>
                  </div>
                </Card>
              );
            }

            const profil = listeProfils.find((item) => item.id === profilId);

            if (!profil) {
              return null;
            }

            const estOrganisateurListe = profil.id === sortie.organisateur_id;

            return (
              <Card
                key={profil.id}
                className="flex items-center justify-between gap-3 p-3"
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

                  <p className="text-sm text-muted-foreground">
                    {profil.age} ans
                  </p>
                </Link>

                {/* ORGANISATEUR */}

                {estOrganisateurListe && (
                  <span className="text-sm text-muted-foreground">
                    Organisateur
                  </span>
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
              </Card>
            );
          })}
        </div>
      </section>

      {/* DEMANDE DE PARTICIPATION EN ATTENTE */}

      {demandeParticipation &&
        sortie.mode_inscription === "validation" &&
        sortie.statut === "planifiee" &&
        !sortiePassee && (
          <Card className="mb-8 p-4">
            <p className="font-medium">Votre demande est en attente.</p>

            {complet ? (
              <p className="mt-2 text-sm text-muted-foreground">
                La sortie est actuellement complète. Votre demande reste active
                si une place se libère.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {nombrePlacesDisponibles}{" "}
                {nombrePlacesDisponibles === 1
                  ? "place disponible"
                  : "places disponibles"}
                .
              </p>
            )}

            <p className="mt-1 text-sm text-muted-foreground">
              {totalDemandesEnAttente}{" "}
              {totalDemandesEnAttente === 1
                ? "demande en attente."
                : "demandes en attente."}
            </p>
          </Card>
        )}

      {!estOrganisateur && (
        <section
          className="
            mt-8
            border-t
            pt-6
        "
        >
          <SignalerButton
            typeCible="sortie"
            cibleId={sortie.id}
            libelle="Signaler cette sortie"
          />
        </section>
      )}

      {/* PARTICIPATION */}

      {/* BANDEAU D'ACTION FIXE */}

      <div
        className=" fixed inset-x-0 bottom-0 z-50 border-t border-border
        bg-card text-card-foreground shadow-lg "
      >
        <Card className="flex items-center justify-between gap-3 p-3">
          {/* NOMBRE DE PARTICIPANTS */}

          <div className="shrink-0">
            <p className="text-sm text-muted-foreground">Participants</p>

            <p className="font-semibold">
              {nombreActuel} / {sortie.nombre_max_participants}
            </p>
          </div>

          {/* ACTIONS */}

          <div className="flex flex-1 items-center justify-end gap-2">
            {sortie.statut === "annulee" ? (
              <span className="font-medium text-muted-foreground">
                Sortie annulée
              </span>
            ) : sortiePassee ? (
              <span className="font-medium text-muted-foreground">
                Sortie terminée
              </span>
            ) : estExcluDeLaSortie ? (
              <span className="font-medium text-destructive">
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
        </Card>
      </div>
    </main>
  );
}
