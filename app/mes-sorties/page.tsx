import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { afficherDuree, afficherTypeEntrainement } from "@/lib/sortie-utils";
import { formatDateLongue, formatHeure, getDateKey } from "@/lib/date-utils";

export default async function MesSortiesPage() {
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
  // CHARGEMENT DES DONNÉES
  // ------------------------------------------------

  type SortieListe = {
    id: string;
    titre: string;
    organisateur_id: string;
    date_heure_depart: string;
    lieu_depart: string;
    type_sortie: string;
    nombre_max_participants: number;
    type_entrainement: string | null;
    distance_km: number | null;
    denivele_positif_m: number | null;
    duree_estimee_minutes: number | null;
    statut: string;
  };

  const champsSortie = `
    id,
    titre,
    organisateur_id,
    date_heure_depart,
    lieu_depart,
    type_sortie,
    nombre_max_participants,
    type_entrainement,
    distance_km,
    denivele_positif_m,
    duree_estimee_minutes,
    statut
  ` as const;

  const maintenant = new Date().toISOString();

  // Ces quatre requêtes sont indépendantes :
  // on les exécute donc en parallèle.
  const [
    utilisateursIndisponiblesResult,
    sortiesOrganiseesResult,
    mesDemandesEnAttenteResult,
    mesParticipationsResult,
  ] = await Promise.all([
    supabase.rpc("mes_utilisateurs_indisponibles"),

    supabase
      .from("sorties")
      .select(champsSortie)
      .eq("organisateur_id", user.id)
      .order("date_heure_depart", {
        ascending: true,
      }),

    supabase
      .from("demandes_participation")
      .select("sortie_id")
      .eq("utilisateur_id", user.id)
      .eq("statut", "en_attente"),

    supabase
      .from("participations")
      .select("sortie_id")
      .eq("utilisateur_id", user.id),
  ]);

  if (
    utilisateursIndisponiblesResult.error ||
    sortiesOrganiseesResult.error ||
    mesDemandesEnAttenteResult.error ||
    mesParticipationsResult.error
  ) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des sorties.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // UTILISATEURS INDISPONIBLES
  // ------------------------------------------------

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesResult.data ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  // ------------------------------------------------
  // SORTIES QUE J'ORGANISE
  // ------------------------------------------------

  const toutesSortiesOrganisees = (sortiesOrganiseesResult.data ??
    []) as SortieListe[];

  const sortiesOrganisees = toutesSortiesOrganisees.filter(
    (sortie) => sortie.date_heure_depart >= maintenant,
  );

  const sortiesOrganiseesPassees = toutesSortiesOrganisees
    .filter((sortie) => sortie.date_heure_depart < maintenant)
    .reverse();

  const idsSortiesOrganisees = sortiesOrganisees.map((sortie) => sortie.id);

  // ------------------------------------------------
  // MES DEMANDES EN ATTENTE
  // ------------------------------------------------

  const idsMesDemandesEnAttente = [
    ...new Set(
      (mesDemandesEnAttenteResult.data ?? []).map(
        (demande) => demande.sortie_id,
      ),
    ),
  ];

  // ------------------------------------------------
  // MES PARTICIPATIONS
  // ------------------------------------------------

  const idsSortiesParticipees = [
    ...new Set(
      (mesParticipationsResult.data ?? []).map(
        (participation) => participation.sortie_id,
      ),
    ),
  ];

  // ------------------------------------------------
  // REQUÊTES DÉPENDANTES
  // ------------------------------------------------

  const demandesSurMesSortiesPromise =
    idsSortiesOrganisees.length > 0
      ? supabase
          .from("demandes_participation")
          .select("sortie_id")
          .in("sortie_id", idsSortiesOrganisees)
          .eq("statut", "en_attente")
      : Promise.resolve({
          data: [] as { sortie_id: string }[],
          error: null,
        });

  const sortiesEnAttentePromise =
    idsMesDemandesEnAttente.length > 0
      ? supabase
          .from("sorties")
          .select(champsSortie)
          .in("id", idsMesDemandesEnAttente)
          .gte("date_heure_depart", maintenant)
          .order("date_heure_depart", {
            ascending: true,
          })
      : Promise.resolve({
          data: [] as SortieListe[],
          error: null,
        });

  const sortiesParticipeesPromise =
    idsSortiesParticipees.length > 0
      ? supabase
          .from("sorties")
          .select(champsSortie)
          .in("id", idsSortiesParticipees)
          .order("date_heure_depart", {
            ascending: true,
          })
      : Promise.resolve({
          data: [] as SortieListe[],
          error: null,
        });

  const [
    demandesSurMesSortiesResult,
    sortiesEnAttenteResult,
    sortiesParticipeesResult,
  ] = await Promise.all([
    demandesSurMesSortiesPromise,
    sortiesEnAttentePromise,
    sortiesParticipeesPromise,
  ]);

  if (
    demandesSurMesSortiesResult.error ||
    sortiesEnAttenteResult.error ||
    sortiesParticipeesResult.error
  ) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Erreur lors du chargement des sorties.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // DEMANDES REÇUES PAR SORTIE
  // ------------------------------------------------

  const nombreDemandesParSortie = (
    demandesSurMesSortiesResult.data ?? []
  ).reduce<Record<string, number>>((compteur, demande) => {
    compteur[demande.sortie_id] = (compteur[demande.sortie_id] ?? 0) + 1;

    return compteur;
  }, {});

  // ------------------------------------------------
  // SORTIES EN ATTENTE DE VALIDATION
  // ------------------------------------------------

  const sortiesEnAttente = (sortiesEnAttenteResult.data ?? []) as SortieListe[];

  // ------------------------------------------------
  // SORTIES AUXQUELLES JE PARTICIPE
  // ------------------------------------------------

  const toutesSortiesParticipees = (sortiesParticipeesResult.data ??
    []) as SortieListe[];

  const sortiesParticipees = toutesSortiesParticipees.filter(
    (sortie) => sortie.date_heure_depart >= maintenant,
  );

  const sortiesParticipeesPassees = toutesSortiesParticipees
    .filter((sortie) => sortie.date_heure_depart < maintenant)
    .reverse();

  const listeSortiesOrganisees = (sortiesOrganisees ?? []).filter(
    (sortie) => sortie.statut === "planifiee",
  );

  const listeSortiesParticipees = sortiesParticipees.filter(
    (sortie) =>
      sortie.statut === "planifiee" &&
      !idsIndisponibles.has(sortie.organisateur_id),
  );

  const listeSortiesEnAttente = sortiesEnAttente.filter(
    (sortie) =>
      sortie.statut === "planifiee" &&
      !idsIndisponibles.has(sortie.organisateur_id),
  );

  // ------------------------------------------------
  // SORTIES ANNULÉES
  // ------------------------------------------------

  const sortiesOrganiseesAnnulees = [
    ...(sortiesOrganisees ?? []).filter(
      (sortie) => sortie.statut === "annulee",
    ),

    ...(sortiesOrganiseesPassees ?? []).filter(
      (sortie) => sortie.statut === "annulee",
    ),
  ];

  const sortiesParticipeesAnnulees = [
    ...sortiesParticipees.filter(
      (sortie) =>
        sortie.statut === "annulee" &&
        !idsIndisponibles.has(sortie.organisateur_id),
    ),

    ...sortiesParticipeesPassees.filter(
      (sortie) =>
        sortie.statut === "annulee" &&
        !idsIndisponibles.has(sortie.organisateur_id),
    ),
  ];
  // ------------------------------------------------
  // HISTORIQUE
  // On exclut les sorties annulées,
  // puisqu'elles ont leur propre section.
  // ------------------------------------------------

  const historiqueSortiesOrganisees = (sortiesOrganiseesPassees ?? []).filter(
    (sortie) => sortie.statut !== "annulee",
  );

  const historiqueSortiesParticipees = sortiesParticipeesPassees.filter(
    (sortie) =>
      sortie.statut !== "annulee" &&
      !idsIndisponibles.has(sortie.organisateur_id),
  );

  const nombreSortiesAnnulees =
    sortiesOrganiseesAnnulees.length + sortiesParticipeesAnnulees.length;

  const nombreSortiesHistorique =
    historiqueSortiesOrganisees.length + historiqueSortiesParticipees.length;

  const aDesSortiesAVenir =
    listeSortiesOrganisees.length > 0 ||
    listeSortiesParticipees.length > 0 ||
    listeSortiesEnAttente.length > 0;

  // ------------------------------------------------
  // PETIT COMPOSANT D'AFFICHAGE
  // ------------------------------------------------

  function afficherSortie(
    sortie: {
      id: string;
      titre: string;
      date_heure_depart: string;
      lieu_depart: string;
      type_sortie: string;
      nombre_max_participants: number;
      type_entrainement: string | null;
      distance_km: number | null;
      denivele_positif_m: number | null;
      duree_estimee_minutes: number | null;
      statut: string;
    },
    estOrganisateur: boolean,
    demandeEnAttente: boolean = false,
  ) {
    const dateKey = getDateKey(new Date(sortie.date_heure_depart));

    const nombreDemandes = nombreDemandesParSortie[sortie.id] ?? 0;

    return (
      <Link
        key={sortie.id}
        href={`/sorties/${sortie.id}`}
        className="
    relative
    block
    overflow-hidden
    rounded
    border
    px-4
    py-3
    transition
    hover:bg-gray-500/5

    after:absolute
    after:bottom-0
    after:left-0
    after:h-[3px]
    after:w-full
    after:origin-left
    after:scale-x-0
    after:bg-[#8ED8B6]
    after:transition-transform
    after:duration-200

    hover:after:scale-x-100
  "
      >
        <div
          className="
          flex
          items-start
          justify-between
          gap-4
        "
        >
          <div className="min-w-0">
            {/* TITRE */}

            <h3 className="font-semibold">{sortie.titre}</h3>

            {/* TYPE + ENTRAÎNEMENT */}

            <p className="mt-0.5 text-sm font-medium">
              {sortie.type_sortie === "trail" ? "Trail" : "Route"}

              {sortie.type_entrainement && (
                <>
                  {" · "}
                  {afficherTypeEntrainement(sortie.type_entrainement)}
                </>
              )}
            </p>

            {/* DISTANCE + D+ + DURÉE */}

            {(sortie.distance_km !== null ||
              sortie.denivele_positif_m !== null ||
              sortie.duree_estimee_minutes !== null) && (
              <p className="mt-0.5 text-sm text-gray-500">
                {sortie.distance_km !== null && (
                  <>
                    {Number(sortie.distance_km).toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    km
                  </>
                )}

                {sortie.denivele_positif_m !== null && (
                  <>
                    {sortie.distance_km !== null && " · "}
                    {sortie.denivele_positif_m} m D+
                  </>
                )}

                {sortie.duree_estimee_minutes !== null && (
                  <>
                    {(sortie.distance_km !== null ||
                      sortie.denivele_positif_m !== null) &&
                      " · "}

                    {afficherDuree(sortie.duree_estimee_minutes)}
                  </>
                )}
              </p>
            )}

            {/* DATE + LIEU */}

            <p className="mt-1 text-sm">
              {formatDateLongue(dateKey)}
              {" · "}
              <strong>{formatHeure(sortie.date_heure_depart)}</strong>

              {sortie.lieu_depart && (
                <>
                  {" · "}
                  {sortie.lieu_depart}
                </>
              )}
            </p>
          </div>

          {/* ÉTAT / INFORMATIONS */}

          <div
            className="
            flex
            shrink-0
            flex-col
            items-end
            gap-1
          "
          >
            {sortie.statut === "annulee" && (
              <span
                className="
                rounded-full
                border
                px-2
                py-0.5
                text-xs
                font-medium
              "
              >
                Annulée
              </span>
            )}

            {demandeEnAttente && (
              <span
                className="
                rounded-full
                border
                px-2
                py-0.5
                text-xs
                font-medium
              "
              >
                En attente
              </span>
            )}

            {estOrganisateur && nombreDemandes > 0 && (
              <span
                className="
                  rounded-full
                  bg-[#8ED8B6]
                  px-2
                  py-0.5
                  text-xs
                  font-medium
                  text-black
                "
              >
                {nombreDemandes === 1
                  ? "1 demande"
                  : `${nombreDemandes} demandes`}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mes sorties</h1>
      </div>

      {/* ==================================================
        SORTIES À VENIR
    ================================================== */}

      <section className="mb-10">
        <h2 className="mb-6 text-xl font-semibold">À venir</h2>

        {!aDesSortiesAVenir ? (
          <p className="text-sm text-gray-500">
            Vous n&apos;avez aucune sortie à venir.
          </p>
        ) : (
          <div className="space-y-8">
            {/* J'ORGANISE */}

            {listeSortiesOrganisees.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold">J&apos;organise</h3>

                <div className="space-y-2">
                  {listeSortiesOrganisees.map((sortie) =>
                    afficherSortie(sortie, true),
                  )}
                </div>
              </div>
            )}

            {/* JE PARTICIPE */}

            {listeSortiesParticipees.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold">Je participe</h3>

                <div className="space-y-2">
                  {listeSortiesParticipees.map((sortie) =>
                    afficherSortie(sortie, false),
                  )}
                </div>
              </div>
            )}

            {/* MES DEMANDES */}

            {listeSortiesEnAttente.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold">En attente de validation</h3>

                <div className="space-y-2">
                  {listeSortiesEnAttente.map((sortie) =>
                    afficherSortie(sortie, false, true),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ==================================================
        AUTRES SORTIES
    ================================================== */}

      {(nombreSortiesAnnulees > 0 || nombreSortiesHistorique > 0) && (
        <section className="border-t pt-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">
            Autres sorties
          </h2>

          {/* SORTIES ANNULÉES */}

          {nombreSortiesAnnulees > 0 && (
            <details className="border-b py-4">
              <summary
                className="
                cursor-pointer
                font-medium
              "
              >
                Sorties annulées{" "}
                <span className="text-sm text-gray-500">
                  ({nombreSortiesAnnulees})
                </span>
              </summary>

              <div className="mt-5 space-y-6">
                {sortiesOrganiseesAnnulees.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      J&apos;organisais
                    </h3>

                    <div className="space-y-2">
                      {sortiesOrganiseesAnnulees.map((sortie) =>
                        afficherSortie(sortie, false),
                      )}
                    </div>
                  </div>
                )}

                {sortiesParticipeesAnnulees.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      Je participais
                    </h3>

                    <div className="space-y-2">
                      {sortiesParticipeesAnnulees.map((sortie) =>
                        afficherSortie(sortie, false),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* HISTORIQUE */}

          {nombreSortiesHistorique > 0 && (
            <details className="py-4">
              <summary
                className="
                cursor-pointer
                font-medium
              "
              >
                Historique{" "}
                <span className="text-sm text-gray-500">
                  ({nombreSortiesHistorique})
                </span>
              </summary>

              <div className="mt-5 space-y-6">
                {historiqueSortiesOrganisees.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      J&apos;ai organisé
                    </h3>

                    <div className="space-y-2">
                      {historiqueSortiesOrganisees.map((sortie) =>
                        afficherSortie(sortie, false),
                      )}
                    </div>
                  </div>
                )}

                {historiqueSortiesParticipees.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      J&apos;ai participé
                    </h3>

                    <div className="space-y-2">
                      {historiqueSortiesParticipees.map((sortie) =>
                        afficherSortie(sortie, false),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </section>
      )}
    </main>
  );
}
