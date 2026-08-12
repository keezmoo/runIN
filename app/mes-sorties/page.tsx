import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SupprimerSortieButton from "./supprimer-sortie-button";
import {
    afficherDuree,
    afficherTypeEntrainement,
} from "@/lib/sortie-utils";
import AnnulerSortieButton from "./annuler-sortie-button";
import {
    formatDateLongue,
    formatHeure,
    getDateKey,
} from "@/lib/date-utils";


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
    // SORTIES QUE J'ORGANISE
    // ------------------------------------------------

    const {
        data: sortiesOrganisees,
        error: sortiesOrganiseesError,
    } = await supabase
        .from("sorties")
        .select(
            `
        id,
        titre,
        date_heure_depart,
        lieu_depart,
        type_sortie,
        nombre_max_participants,
        type_entrainement,
        distance_km,
        denivele_positif_m,
        duree_estimee_minutes,
        statut
      `
        )
        .eq("organisateur_id", user.id)
        .gte(
            "date_heure_depart",
            new Date().toISOString()
        )
        .order("date_heure_depart", {
            ascending: true,
        });

    // ------------------------------------------------
    // SORTIES PASSÉES QUE J'AI ORGANISÉES
    // ------------------------------------------------

    const {
        data: sortiesOrganiseesPassees,
        error: sortiesOrganiseesPasseesError,
    } = await supabase
        .from("sorties")
        .select(`
        id,
        titre,
        date_heure_depart,
        lieu_depart,
        type_sortie,
        nombre_max_participants,
        type_entrainement,
        distance_km,
        denivele_positif_m,
        duree_estimee_minutes,
        statut
    `)
        .eq("organisateur_id", user.id)
        .lt(
            "date_heure_depart",
            new Date().toISOString()
        )
        .order("date_heure_depart", {
            ascending: false,
        });

    // ------------------------------------------------
    // DEMANDES EN ATTENTE SUR MES SORTIES
    // ------------------------------------------------

    const idsSortiesOrganisees =
        sortiesOrganisees?.map(
            (sortie) => sortie.id
        ) ?? [];

    // ------------------------------------------------
    // INTERACTIONS SUR MES SORTIES
    // ------------------------------------------------

    let demandesSurMesSorties: {
        sortie_id: string;
        statut: string;
    }[] = [];

    let participationsSurMesSorties: {
        sortie_id: string;
    }[] = [];


    if (idsSortiesOrganisees.length > 0) {

        // Toutes les demandes, quel que soit leur statut
        const {
            data: demandesData,
            error: demandesError,
        } = await supabase
            .from("demandes_participation")
            .select("sortie_id, statut")
            .in(
                "sortie_id",
                idsSortiesOrganisees
            );

        if (demandesError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement des demandes.
                    </p>
                </main>
            );
        }

        demandesSurMesSorties =
            demandesData ?? [];


        // Participants inscrits
        const {
            data: participationsData,
            error: participationsMesSortiesError,
        } = await supabase
            .from("participations")
            .select("sortie_id")
            .in(
                "sortie_id",
                idsSortiesOrganisees
            );

        if (participationsMesSortiesError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement des participants.
                    </p>
                </main>
            );
        }

        participationsSurMesSorties =
            participationsData ?? [];
    }


    // ------------------------------------------------
    // DEMANDES EN ATTENTE UNIQUEMENT
    // ------------------------------------------------

    const demandesEnAttente =
        demandesSurMesSorties.filter(
            (demande) =>
                demande.statut === "en_attente"
        );


    // ------------------------------------------------
    // NOMBRE DE DEMANDES EN ATTENTE PAR SORTIE
    // ------------------------------------------------

    const nombreDemandesParSortie =
        demandesEnAttente.reduce<
            Record<string, number>
        >((compteur, demande) => {

            compteur[demande.sortie_id] =
                (compteur[demande.sortie_id] ?? 0) + 1;

            return compteur;
        }, {});

    const sortiesAvecDemandes =
        new Set(
            demandesSurMesSorties.map(
                (demande) =>
                    demande.sortie_id
            )
        );

    const sortiesAvecParticipants =
        new Set(
            participationsSurMesSorties.map(
                (participation) =>
                    participation.sortie_id
            )
        );
    // ------------------------------------------------
    // MES PROPRES DEMANDES DE PARTICIPATION EN ATTENTE
    // ------------------------------------------------

    const {
        data: mesDemandesEnAttenteData,
        error: mesDemandesEnAttenteError,
    } = await supabase
        .from("demandes_participation")
        .select("sortie_id")
        .eq("utilisateur_id", user.id)
        .eq("statut", "en_attente");

    if (mesDemandesEnAttenteError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement de vos demandes.
                </p>
            </main>
        );
    }

    const idsMesDemandesEnAttente = [
        ...new Set(
            (mesDemandesEnAttenteData ?? []).map(
                (demande) => demande.sortie_id
            )
        ),
    ];

    let sortiesEnAttente: {
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
    }[] = [];

    if (idsMesDemandesEnAttente.length > 0) {
        const {
            data,
            error: sortiesEnAttenteError,
        } = await supabase
            .from("sorties")
            .select(`
        id,
        titre,
        date_heure_depart,
        lieu_depart,
        type_sortie,
        nombre_max_participants,
        type_entrainement,
        distance_km,
        denivele_positif_m,
        duree_estimee_minutes,
        statut
    `)
            .in(
                "id",
                idsMesDemandesEnAttente
            )
            .gte(
                "date_heure_depart",
                new Date().toISOString()
            )
            .order(
                "date_heure_depart",
                { ascending: true }
            );

        if (sortiesEnAttenteError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement des sorties en attente.
                    </p>
                </main>
            );
        }

        sortiesEnAttente = data ?? [];
    }

    // ------------------------------------------------
    // PARTICIPATIONS DE L'UTILISATEUR
    // ------------------------------------------------

    const {
        data: mesParticipations,
        error: participationsError,
    } = await supabase
        .from("participations")
        .select("sortie_id")
        .eq("utilisateur_id", user.id);

    const idsSortiesParticipees =
        mesParticipations?.map(
            (participation) => participation.sortie_id
        ) ?? [];

    // ------------------------------------------------
    // SORTIES AUXQUELLES JE PARTICIPE
    // ------------------------------------------------

    let sortiesParticipees: {
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
    }[] = [];

    if (idsSortiesParticipees.length > 0) {
        const {
            data,
            error: sortiesParticipeesError,
        } = await supabase
            .from("sorties")
            .select(
                `
          id,
          titre,
          date_heure_depart,
          lieu_depart,
          type_sortie,
          nombre_max_participants,
          type_entrainement,
        distance_km,
        denivele_positif_m,
        duree_estimee_minutes,
        statut
        `
            )
            .in("id", idsSortiesParticipees)
            .gte(
                "date_heure_depart",
                new Date().toISOString()
            )
            .order("date_heure_depart", {
                ascending: true,
            });

        if (sortiesParticipeesError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement des sorties.
                    </p>
                </main>
            );
        }

        sortiesParticipees = data ?? [];
    }

    // ------------------------------------------------
    // SORTIES PASSÉES AUXQUELLES J'AI PARTICIPÉ
    // ------------------------------------------------

    let sortiesParticipeesPassees: {
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
    }[] = [];

    if (idsSortiesParticipees.length > 0) {
        const {
            data,
            error: sortiesParticipeesPasseesError,
        } = await supabase
            .from("sorties")
            .select(`
            id,
            titre,
            date_heure_depart,
            lieu_depart,
            type_sortie,
            nombre_max_participants,
            type_entrainement,
            distance_km,
            denivele_positif_m,
            duree_estimee_minutes,
            statut
        `)
            .in(
                "id",
                idsSortiesParticipees
            )
            .lt(
                "date_heure_depart",
                new Date().toISOString()
            )
            .order("date_heure_depart", {
                ascending: false,
            });

        if (sortiesParticipeesPasseesError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement de l&apos;historique.
                    </p>
                </main>
            );
        }

        sortiesParticipeesPassees =
            data ?? [];
    }

    // ------------------------------------------------
    // ERREURS
    // ------------------------------------------------

    if (
        sortiesOrganiseesError ||
        sortiesOrganiseesPasseesError ||
        participationsError
    ) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement des sorties.
                </p>
            </main>
        );
    }

    const listeSortiesOrganisees =
        (sortiesOrganisees ?? []).filter(
            (sortie) =>
                sortie.statut === "planifiee"
        );

    const sortiesOrganiseesAnnulees =
        (sortiesOrganisees ?? []).filter(
            (sortie) =>
                sortie.statut === "annulee"
        );

    const listeSortiesParticipees =
        sortiesParticipees.filter(
            (sortie) =>
                sortie.statut === "planifiee"
        );

    const sortiesParticipeesAnnulees =
        sortiesParticipees.filter(
            (sortie) =>
                sortie.statut === "annulee"
        );

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
        demandeEnAttente: boolean = false
    ) {

        const dateKey = getDateKey(
            new Date(sortie.date_heure_depart)
        );
        const nombreDemandes =
            nombreDemandesParSortie[sortie.id] ?? 0;

        const peutSupprimer =
            estOrganisateur &&
            sortie.statut === "planifiee" &&
            new Date(
                sortie.date_heure_depart
            ).getTime() > Date.now() &&
            !sortiesAvecDemandes.has(
                sortie.id
            ) &&
            !sortiesAvecParticipants.has(
                sortie.id
            );

        return (
            <div
                key={sortie.id}
                className="rounded border p-4"
            >

                {/* Partie cliquable vers la fiche */}
                <Link
                    href={`/sorties/${sortie.id}`}
                    className="block rounded hover:bg-gray-500/5"
                >

                    <h3 className="text-lg font-semibold">
                        {sortie.titre}
                    </h3>

                    {sortie.statut === "annulee" && (
                        <div className="mt-2">
                            <span className="inline-block rounded-full border px-3 py-1 text-sm font-semibold">
                                Sortie annulée
                            </span>
                        </div>
                    )}

                    {/* TYPE DE SORTIE + ENTRAÎNEMENT */}

                    <p className="mt-1 text-sm font-medium">

                        {sortie.type_sortie === "trail"
                            ? "Trail"
                            : "Route"}

                        {sortie.type_entrainement && (
                            <>
                                {" · "}
                                {afficherTypeEntrainement(
                                    sortie.type_entrainement
                                )}
                            </>
                        )}

                    </p>


                    {/* DISTANCE + D+ + DURÉE */}

                    {(
                        sortie.distance_km !== null ||
                        sortie.denivele_positif_m !== null ||
                        sortie.duree_estimee_minutes !== null
                    ) && (

                            <p className="mt-2 text-sm text-gray-600">

                                {sortie.distance_km !== null && (
                                    <>
                                        {Number(
                                            sortie.distance_km
                                        ).toLocaleString(
                                            "fr-FR",
                                            {
                                                maximumFractionDigits: 1,
                                            }
                                        )} km
                                    </>
                                )}


                                {sortie.denivele_positif_m !== null && (
                                    <>
                                        {sortie.distance_km !== null &&
                                            " · "}

                                        {sortie.denivele_positif_m} m D+
                                    </>
                                )}


                                {sortie.duree_estimee_minutes !== null && (
                                    <>
                                        {(
                                            sortie.distance_km !== null ||
                                            sortie.denivele_positif_m !== null
                                        ) && " · "}

                                        {afficherDuree(
                                            sortie.duree_estimee_minutes
                                        )}
                                    </>
                                )}

                            </p>
                        )}


                    {/* DATE */}

                    <p className="mt-2">
                        {formatDateLongue(dateKey)}
                        {" — "}
                        <strong>
                            {formatHeure(
                                sortie.date_heure_depart
                            )}
                        </strong>
                    </p>

                    <p className="mt-1">
                        {sortie.lieu_depart}
                    </p>

                    {demandeEnAttente && (
                        <div className="mt-3">
                            <span className="inline-block rounded-full border px-3 py-1 text-sm font-medium">
                                En attente de validation
                            </span>
                        </div>
                    )}

                    {/* Demandes en attente */}
                    {estOrganisateur &&
                        nombreDemandes > 0 && (

                            <div className="mt-3">
                                <span className="inline-block rounded-full bg-[#8ED8B6] px-3 py-1 text-sm font-medium text-black">
                                    {nombreDemandes}{" "}
                                    {nombreDemandes === 1
                                        ? "demande en attente"
                                        : "demandes en attente"}
                                </span>
                            </div>

                        )}

                </Link>


                {/* Actions de l'organisateur */}
                {estOrganisateur &&
                    sortie.statut === "planifiee" && (

                        <div className="mt-4 flex flex-wrap gap-3">

                            <Link
                                href={`/sorties/${sortie.id}/modifier`}
                                className="rounded border px-4 py-2"
                            >
                                Modifier
                            </Link>

                            <AnnulerSortieButton
                                sortieId={sortie.id}
                                titre={sortie.titre}
                            />

                            {peutSupprimer && (
                                <SupprimerSortieButton
                                    sortieId={sortie.id}
                                    titre={sortie.titre}
                                />
                            )}

                        </div>
                    )}

            </div>
        );
    }

    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (
        <main className="mx-auto max-w-2xl p-6">

            <div className="mb-8">
                <h1 className="text-2xl font-bold">
                    Mes sorties
                </h1>
            </div>


            {/* SORTIES ORGANISÉES */}

            <section className="mb-10">

                <h2 className="mb-4 text-xl font-semibold">
                    J&apos;organise
                </h2>

                {listeSortiesOrganisees.length === 0 ? (
                    <p className="text-gray-500">
                        Vous n&apos;organisez aucune sortie à venir.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {listeSortiesOrganisees.map(
                            (sortie) =>
                                afficherSortie(sortie, true)
                        )}
                    </div>
                )}

            </section>

            {/* ------------------------------------------------
    MES DEMANDES EN ATTENTE
------------------------------------------------ */}

            {sortiesEnAttente.length > 0 && (
                <section className="mb-10">

                    <h2 className="mb-4 text-xl font-semibold">
                        Mes demandes en attente
                    </h2>

                    <div className="space-y-4">
                        {sortiesEnAttente.map(
                            (sortie) =>
                                afficherSortie(
                                    sortie,
                                    false,
                                    true
                                )
                        )}
                    </div>

                </section>
            )}

            {/* SORTIES AUXQUELLES JE PARTICIPE */}

            <section>

                <h2 className="mb-4 text-xl font-semibold">
                    Je participe
                </h2>

                {sortiesParticipees.length === 0 ? (
                    <p className="text-gray-500">
                        Vous ne participez à aucune sortie à venir.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {listeSortiesParticipees.map(
                            (sortie) =>
                                afficherSortie(
                                    sortie,
                                    false
                                )
                        )}
                    </div>
                )}

            </section>

            {(
                sortiesOrganiseesAnnulees.length > 0 ||
                sortiesParticipeesAnnulees.length > 0
            ) && (
                    <section className="space-y-4">

                        <h2 className="text-2xl font-semibold">
                            Sorties annulées
                        </h2>


                        {sortiesOrganiseesAnnulees.length > 0 && (
                            <div className="space-y-3">

                                <h3 className="font-semibold">
                                    J&apos;organisais
                                </h3>

                                {sortiesOrganiseesAnnulees.map(
                                    (sortie) =>
                                        afficherSortie(
                                            sortie,
                                            false
                                        )
                                )}

                            </div>
                        )}


                        {sortiesParticipeesAnnulees.length > 0 && (
                            <div className="space-y-3">

                                <h3 className="font-semibold">
                                    Je participais
                                </h3>

                                {sortiesParticipeesAnnulees.map(
                                    (sortie) =>
                                        afficherSortie(
                                            sortie,
                                            false
                                        )
                                )}

                            </div>
                        )}

                    </section>
                )}


            {/* ------------------------------------------------
    HISTORIQUE
------------------------------------------------ */}

            <section className="mt-12 border-t pt-8">

                <h2 className="mb-6 text-2xl font-bold">
                    Historique
                </h2>


                {/* J'AI ORGANISÉ */}

                <div className="mb-10">

                    <h3 className="mb-4 text-xl font-semibold">
                        J&apos;ai organisé
                    </h3>

                    {(sortiesOrganiseesPassees ?? []).length === 0 ? (
                        <p className="text-gray-500">
                            Aucune sortie organisée dans l&apos;historique.
                        </p>
                    ) : (
                        <div className="space-y-4">

                            {(sortiesOrganiseesPassees ?? []).map(
                                (sortie) =>
                                    afficherSortie(
                                        sortie,
                                        false
                                    )
                            )}

                        </div>
                    )}

                </div>


                {/* J'AI PARTICIPÉ */}

                <div>

                    <h3 className="mb-4 text-xl font-semibold">
                        J&apos;ai participé
                    </h3>

                    {sortiesParticipeesPassees.length === 0 ? (
                        <p className="text-gray-500">
                            Aucune participation dans l&apos;historique.
                        </p>
                    ) : (
                        <div className="space-y-4">

                            {sortiesParticipeesPassees.map(
                                (sortie) =>
                                    afficherSortie(
                                        sortie,
                                        false
                                    )
                            )}

                        </div>
                    )}

                </div>

            </section>

        </main>
    );
}