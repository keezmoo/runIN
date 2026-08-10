import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import ParticiperButton from "./participer-button";
import FiltresSorties from "./filtres-sorties";
import NavigationJours from "./navigation-jours";

import {
    ajouterJours,
    formatDateCourte,
    formatDateLongue,
    formatHeure,
    getDateKey,
} from "@/lib/date-utils";

type SortiesPageProps = {
    searchParams: Promise<{
        lieu?: string;
        type?: string;
        date?: string;
    }>;
};

export default async function SortiesPage({
    searchParams,
}: SortiesPageProps) {
    const params = await searchParams;

    const filtreLieu = params.lieu ?? "";
    const filtreType = params.type ?? "";
    const filtreDate = params.date ?? "";

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

    // ------------------------------------------------
    // RECHERCHE DES SORTIES
    // ------------------------------------------------

    let sortiesQuery = supabase
        .from("sorties")
        .select(`
      id,
      titre,
      organisateur_id,
      nombre_max_participants,
      date_heure_depart,
      lieu_depart,
      type_sortie
    `);

    // Filtre par lieu
    if (filtreLieu.trim()) {
        sortiesQuery = sortiesQuery.ilike(
            "lieu_depart",
            `%${filtreLieu.trim()}%`
        );
    }

    // Type : Trail ou Route
    if (
        filtreType === "route" ||
        filtreType === "trail"
    ) {
        sortiesQuery = sortiesQuery.eq(
            "type_sortie",
            filtreType
        );
    }

    // Si une date est choisie dans le filtre
    if (filtreDate) {
        sortiesQuery = sortiesQuery.gte(
            "date_heure_depart",
            filtreDate
        );
    } else {
        // Sinon, on ne montre que les sorties futures
        sortiesQuery = sortiesQuery.gte(
            "date_heure_depart",
            new Date().toISOString()
        );
    }

    // Plus proche dans le temps en premier
    sortiesQuery = sortiesQuery.order(
        "date_heure_depart",
        { ascending: true }
    );

    const {
        data: sorties,
        error: sortiesError,
    } = await sortiesQuery;

    // ------------------------------------------------
    // PARTICIPATIONS
    // ------------------------------------------------

    const {
        data: participations,
        error: participationsError,
    } = await supabase
        .from("participations")
        .select("sortie_id, utilisateur_id");

    // ------------------------------------------------
    // PROFILS
    // ------------------------------------------------

    const {
        data: profils,
        error: profilsError,
    } = await supabase
        .from("profiles")
        .select("id, nom");

    if (
        sortiesError ||
        participationsError ||
        profilsError
    ) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Erreur lors du chargement des sorties.
                </p>
            </main>
        );
    }

    const listeSorties = sorties ?? [];
    const listeParticipations = participations ?? [];
    const listeProfils = profils ?? [];

    // ------------------------------------------------
    // REGROUPEMENT DES SORTIES PAR JOUR
    // ------------------------------------------------

    type Sortie = (typeof listeSorties)[number];

    const sortiesParJour = new Map<
        string,
        Sortie[]
    >();

    for (const sortie of listeSorties) {
        const dateKey = getDateKey(
            new Date(sortie.date_heure_depart)
        );

        const groupe =
            sortiesParJour.get(dateKey) ?? [];

        groupe.push(sortie);

        sortiesParJour.set(
            dateKey,
            groupe
        );
    }

    // ------------------------------------------------
    // BARRE AUJOURD'HUI → J+7
    // ------------------------------------------------

    const aujourdHui = getDateKey(new Date());

    const joursNavigation = Array.from(
        { length: 8 },
        (_, index) => {
            const date = ajouterJours(
                aujourdHui,
                index
            );

            let titre = `J+${index}`;

            if (index === 0) {
                titre = "Aujourd'hui";
            }

            if (index === 1) {
                titre = "Demain";
            }

            return {
                date,
                titre,
                sousTitre: formatDateCourte(date),
                disponible:
                    sortiesParJour.has(date),
            };
        }
    );

    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (
        <main className="mx-auto max-w-2xl p-6">

            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    Les sorties
                </h1>

                <Link
                    href="/sorties/nouvelle"
                    className="rounded bg-black px-4 py-2 text-white"
                >
                    Créer une sortie
                </Link>
            </div>


            {/* Filtres */}
            <FiltresSorties
                lieuActuel={filtreLieu}
                typeActuel={filtreType}
                dateActuelle={filtreDate}
            />


            {/* Navigation rapide sur 8 jours */}
            <NavigationJours
                jours={joursNavigation}
            />


            {/* Liste */}
            {listeSorties.length === 0 ? (
                <p>
                    Aucune sortie ne correspond à votre recherche.
                </p>
            ) : (
                <div className="space-y-10">

                    {Array.from(
                        sortiesParJour.entries()
                    ).map(([date, sortiesJour]) => (

                        <section
                            key={date}
                            id={`jour-${date}`}
                            className="scroll-mt-6"
                        >

                            {/* Titre du jour */}
                            <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
                                {date === aujourdHui
                                    ? `Aujourd'hui — ${formatDateLongue(date)}`
                                    : date ===
                                        ajouterJours(aujourdHui, 1)
                                        ? `Demain — ${formatDateLongue(date)}`
                                        : formatDateLongue(date)}
                            </h2>


                            {/* Sorties du jour */}
                            <div className="space-y-4">

                                {sortiesJour.map((sortie) => {

                                    const organisateur =
                                        listeProfils.find(
                                            (profil) =>
                                                profil.id ===
                                                sortie.organisateur_id
                                        );

                                    const participationsSortie =
                                        listeParticipations.filter(
                                            (participation) =>
                                                participation.sortie_id ===
                                                sortie.id
                                        );

                                    const nombreActuel =
                                        1 +
                                        participationsSortie.length;

                                    const dejaParticipant =
                                        participationsSortie.some(
                                            (participation) =>
                                                participation.utilisateur_id ===
                                                user.id
                                        );

                                    const estOrganisateur =
                                        sortie.organisateur_id ===
                                        user.id;

                                    const complet =
                                        nombreActuel >=
                                        sortie.nombre_max_participants;

                                    return (
                                        <div
                                            key={sortie.id}
                                            className="rounded border p-4"
                                        >

                                            <h3 className="text-lg font-semibold">
                                                {sortie.titre}
                                            </h3>

                                            <p className="mt-1 text-sm font-medium">
                                                {sortie.type_sortie ===
                                                    "trail"
                                                    ? "Trail"
                                                    : "Route"}
                                            </p>

                                            <p className="mt-2">
                                                Départ à{" "}
                                                <strong>
                                                    {formatHeure(
                                                        sortie.date_heure_depart
                                                    )}
                                                </strong>
                                            </p>

                                            <p className="mt-1">
                                                {sortie.lieu_depart}
                                            </p>

                                            <p className="mt-1 text-sm">
                                                Organisé par{" "}
                                                <Link
                                                    href={`/membres/${sortie.organisateur_id}`}
                                                    className="font-medium underline"
                                                >
                                                    {organisateur?.nom ??
                                                        "Utilisateur"}
                                                </Link>
                                            </p>

                                            <p className="mt-2">
                                                {nombreActuel} /{" "}
                                                {
                                                    sortie.nombre_max_participants
                                                }{" "}
                                                participants
                                            </p>

                                            <div className="mt-4">
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
                                                />
                                            </div>

                                        </div>
                                    );
                                })}

                            </div>

                        </section>
                    ))}

                </div>
            )}

        </main>
    );
}