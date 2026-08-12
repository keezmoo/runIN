import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import GererDemandeButtons from "./gerer-demande-buttons";
import ParticiperButton from "../participer-button";

import {
    formatDateLongue,
    formatHeure,
    getDateKey,
} from "@/lib/date-utils";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};
function afficherTypeEntrainement(
    type: string | null
) {
    switch (type) {
        case "endurance_fondamentale":
            return "Endurance fondamentale";

        case "sortie_longue":
            return "Sortie longue";

        case "tempo_seuil":
            return "Tempo / seuil";

        case "fractionne":
            return "Fractionné";

        case "cotes":
            return "Côtes";

        case "recuperation":
            return "Récupération";

        case "libre":
            return "Sortie libre";

        default:
            return null;
    }
}


function afficherIntensite(
    intensite: string | null
) {
    switch (intensite) {
        case "tranquille":
            return "Tranquille";

        case "moderee":
            return "Modérée";

        case "soutenue":
            return "Soutenue";

        default:
            return null;
    }
}


function afficherDuree(
    totalMinutes: number
) {
    const heures =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    if (heures === 0) {
        return `${minutes} min`;
    }

    if (minutes === 0) {
        return `${heures} h`;
    }

    return `${heures} h ${minutes}`;
}


function afficherAllure(
    totalSecondes: number
) {
    const minutes =
        Math.floor(totalSecondes / 60);

    const secondes =
        totalSecondes % 60;

    return `${minutes}:${String(secondes).padStart(2, "0")} /km`;
}

export default async function DetailSortiePage({
    params,
}: PageProps) {
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

    const {
        data: sortie,
        error: sortieError,
    } = await supabase
        .from("sorties")
        .select(`
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
    description
`)
        .eq("id", id)
        .maybeSingle();

    if (sortieError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement de la sortie.
                </p>
            </main>
        );
    }

    if (!sortie) {
        notFound();
    }

    // ------------------------------------------------
    // PARTICIPATIONS
    // ------------------------------------------------

    const {
        data: participations,
        error: participationsError,
    } = await supabase
        .from("participations")
        .select("utilisateur_id")
        .eq("sortie_id", sortie.id);

    if (participationsError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement des participants.
                </p>
            </main>
        );
    }

    const listeParticipations =
        participations ?? [];

    // ------------------------------------------------
    // DEMANDE DE PARTICIPATION DE L'UTILISATEUR
    // ------------------------------------------------

    const {
        data: demandeParticipation,
        error: demandeParticipationError,
    } = await supabase
        .from("demandes_participation")
        .select("id")
        .eq("sortie_id", sortie.id)
        .eq("utilisateur_id", user.id)
        .eq("statut", "en_attente")
        .maybeSingle();

    if (demandeParticipationError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement de la demande.
                </p>
            </main>
        );
    }

    // ------------------------------------------------
    // PROFILS
    // ------------------------------------------------

    // L'organisateur compte comme premier participant,
    // même s'il n'est pas dans la table participations.

    const idsProfils = [
        sortie.organisateur_id,
        ...listeParticipations.map(
            (participation) =>
                participation.utilisateur_id
        ),
    ];

    // Évite les doublons éventuels.
    const idsProfilsUniques = [
        ...new Set(idsProfils),
    ];

    const {
        data: profils,
        error: profilsError,
    } = await supabase
        .from("profiles")
        .select("id, nom, age, sexe")
        .in("id", idsProfilsUniques);

    if (profilsError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement des profils.
                </p>
            </main>
        );
    }

    const listeProfils = profils ?? [];

    const organisateur =
        listeProfils.find(
            (profil) =>
                profil.id === sortie.organisateur_id
        ) ?? null;

    // ------------------------------------------------
    // ÉTAT DE LA PARTICIPATION
    // ------------------------------------------------

    const nombreActuel =
        1 + listeParticipations.length;

    const dejaParticipant =
        listeParticipations.some(
            (participation) =>
                participation.utilisateur_id ===
                user.id
        );

    const estOrganisateur =
        sortie.organisateur_id === user.id;


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
                    <p>
                        Erreur lors du chargement des demandes.
                    </p>
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
        const idsDemandes =
            demandesRecues.map(
                (demande) =>
                    demande.utilisateur_id
            );

        const {
            data,
            error: profilsDemandesError,
        } = await supabase
            .from("profiles")
            .select("id, nom, age")
            .in("id", idsDemandes);

        if (profilsDemandesError) {
            return (
                <main className="mx-auto max-w-2xl p-6">
                    <p>
                        Erreur lors du chargement des profils.
                    </p>
                </main>
            );
        }

        profilsDemandes = data ?? [];
    }


    // ------------------------------------------------
    // SORTIE COMPLÈTE ?
    // ------------------------------------------------

    const complet =
        nombreActuel >=
        sortie.nombre_max_participants;


    // ------------------------------------------------
    // DATE
    // ------------------------------------------------

    const dateKey = getDateKey(
        new Date(sortie.date_heure_depart)
    );

    const typeEntrainementAffiche =
        afficherTypeEntrainement(
            sortie.type_entrainement
        );

    const intensiteAffiche =
        afficherIntensite(
            sortie.intensite
        );
    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (
        <main className="mx-auto max-w-2xl p-6">

            {/* TITRE */}

            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    {sortie.titre}
                </h1>
            </div>


            {/* INFORMATIONS PRINCIPALES */}

            <section className="mb-8 rounded border p-5">

                <div className="space-y-3">

                    {/* DATE */}
                    <div>
                        <p className="text-sm text-gray-500">
                            Date
                        </p>

                        <p>
                            {formatDateLongue(dateKey)}
                            {" — "}
                            <strong>
                                {formatHeure(
                                    sortie.date_heure_depart
                                )}
                            </strong>
                        </p>
                    </div>


                    {/* LIEU */}
                    <div>
                        <p className="text-sm text-gray-500">
                            Lieu de départ
                        </p>

                        <p>
                            {sortie.lieu_depart}
                        </p>
                    </div>


                    {/* TYPE DE SORTIE */}
                    <div>
                        <p className="text-sm text-gray-500">
                            Type de sortie
                        </p>

                        <p>
                            {sortie.type_sortie === "trail"
                                ? "Trail"
                                : "Route"}
                        </p>
                    </div>


                    {/* TYPE D'ENTRAÎNEMENT */}
                    {typeEntrainementAffiche && (
                        <div>
                            <p className="text-sm text-gray-500">
                                Type d&apos;entraînement
                            </p>

                            <p>
                                {typeEntrainementAffiche}
                            </p>
                        </div>
                    )}


                    {/* DISTANCE */}
                    {sortie.distance_km !== null && (
                        <div>
                            <p className="text-sm text-gray-500">
                                Distance
                            </p>

                            <p>
                                {Number(
                                    sortie.distance_km
                                ).toLocaleString(
                                    "fr-FR",
                                    {
                                        maximumFractionDigits: 2,
                                    }
                                )}{" "}
                                km
                            </p>
                        </div>
                    )}


                    {/* DÉNIVELÉ */}
                    {sortie.denivele_positif_m !== null && (
                        <div>
                            <p className="text-sm text-gray-500">
                                Dénivelé positif
                            </p>

                            <p>
                                {sortie.denivele_positif_m} m D+
                            </p>
                        </div>
                    )}


                    {/* DURÉE */}
                    {sortie.duree_estimee_minutes !== null && (
                        <div>
                            <p className="text-sm text-gray-500">
                                Durée estimée
                            </p>

                            <p>
                                {afficherDuree(
                                    sortie.duree_estimee_minutes
                                )}
                            </p>
                        </div>
                    )}


                    {/* INTENSITÉ */}
                    {intensiteAffiche && (
                        <div>
                            <p className="text-sm text-gray-500">
                                Intensité
                            </p>

                            <p>
                                {intensiteAffiche}
                            </p>
                        </div>
                    )}


                    {/* ALLURE - ROUTE UNIQUEMENT */}
                    {sortie.type_sortie === "route" &&
                        sortie.allure_secondes_km !== null && (

                            <div>
                                <p className="text-sm text-gray-500">
                                    Allure prévue
                                </p>

                                <p>
                                    {afficherAllure(
                                        sortie.allure_secondes_km
                                    )}
                                </p>
                            </div>
                        )}


                    {/* PARTICIPANTS */}
                    <div>
                        <p className="text-sm text-gray-500">
                            Participants
                        </p>

                        <p>
                            {nombreActuel} /{" "}
                            {sortie.nombre_max_participants}
                        </p>
                    </div>


                    {/* INSCRIPTION */}
                    <div>
                        <p className="text-sm text-gray-500">
                            Inscription
                        </p>

                        <p>
                            {sortie.mode_inscription === "validation"
                                ? "Sur validation de l'organisateur"
                                : "Automatique"}
                        </p>
                    </div>

                </div>

            </section>

            {sortie.description &&
                sortie.description.trim() !== "" && (

                    <section className="mb-8">

                        <h2 className="mb-3 text-xl font-semibold">
                            Description
                        </h2>

                        <p className="whitespace-pre-wrap">
                            {sortie.description}
                        </p>

                    </section>
                )}

            {/* ORGANISATEUR */}

            <section className="mb-8">

                <h2 className="mb-3 text-xl font-semibold">
                    Organisateur
                </h2>

                {organisateur ? (
                    <Link
                        href={`/membres/${organisateur.id}`}
                        className="block rounded border p-4 hover:bg-gray-500/10"
                    >
                        <p className="font-semibold">
                            {organisateur.nom}
                        </p>

                        <p className="text-sm text-gray-500">
                            {organisateur.age} ans
                        </p>
                    </Link>
                ) : (
                    <p>
                        Profil indisponible.
                    </p>
                )}

            </section>


            {/* DEMANDES DE PARTICIPATION */}

            {estOrganisateur &&
                demandesRecues.length > 0 && (

                    <section className="mb-8">

                        <h2 className="mb-3 text-xl font-semibold">
                            Demandes de participation
                        </h2>

                        <div className="space-y-3">

                            {demandesRecues.map(
                                (demande) => {

                                    const profil =
                                        profilsDemandes.find(
                                            (profil) =>
                                                profil.id ===
                                                demande.utilisateur_id
                                        );

                                    if (!profil) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={demande.id}
                                            className="rounded border p-4"
                                        >

                                            <Link
                                                href={`/membres/${profil.id}`}
                                                className="font-medium"
                                            >
                                                {profil.nom}
                                            </Link>

                                            <p className="mb-3 text-sm text-gray-500">
                                                {profil.age} ans
                                            </p>

                                            <GererDemandeButtons
                                                demandeId={demande.id}
                                            />

                                        </div>
                                    );
                                }
                            )}

                        </div>

                    </section>
                )}

            {/* PARTICIPANTS */}

            <section className="mb-8">

                <h2 className="mb-3 text-xl font-semibold">
                    Participants
                </h2>

                <div className="space-y-2">

                    {idsProfilsUniques.map(
                        (profilId) => {
                            const profil =
                                listeProfils.find(
                                    (item) =>
                                        item.id === profilId
                                );

                            if (!profil) {
                                return null;
                            }

                            const estOrganisateurListe =
                                profil.id ===
                                sortie.organisateur_id;

                            return (
                                <Link
                                    key={profil.id}
                                    href={`/membres/${profil.id}`}
                                    className="flex items-center justify-between rounded border p-3 hover:bg-gray-500/10"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {profil.nom}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {profil.age} ans
                                        </p>
                                    </div>

                                    {estOrganisateurListe && (
                                        <span className="text-sm text-gray-500">
                                            Organisateur
                                        </span>
                                    )}
                                </Link>
                            );
                        }
                    )}

                </div>

            </section>


            {/* PARTICIPATION */}

            <section className="border-t pt-6">

                <ParticiperButton
                    sortieId={sortie.id}
                    userId={user.id}
                    nombreMax={
                        sortie.nombre_max_participants
                    }
                    dejaParticipant={
                        dejaParticipant
                    }
                    estOrganisateur={
                        estOrganisateur
                    }
                    complet={complet}

                    modeInscription={
                        sortie.mode_inscription
                    }

                    demandeEnAttente={
                        Boolean(demandeParticipation)
                    }
                />

            </section>

        </main>
    );
}
