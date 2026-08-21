import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavigationHeures
    from "./navigation-heures";
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
    }>;
};


export default async function SortiesPage({
    searchParams,
}: SortiesPageProps) {
    const params = await searchParams;

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
    // Localisation enregistrée dans le profil
    const {
        data: filtreProfilData,
        error: filtreProfilError,
    } = await supabase.rpc(
        "mon_filtre_geographique"
    );

    const filtreProfil =
        filtreProfilData?.[0] ?? null;

    if (filtreProfilError || !filtreProfil) {
        redirect("/profil");
    }

    const filtreLieu =
        params.lieu ??
        filtreProfil.lieu_recherche ??
        "";

    const filtreRayon =
        params.rayon
            ? Number(params.rayon)
            : filtreProfil.rayon_recherche_km;

    const latitude =
        params.lat
            ? Number(params.lat)
            : filtreProfil.latitude;

    const longitude =
        params.lon
            ? Number(params.lon)
            : filtreProfil.longitude;

    const aujourdHui =
        getDateKey(new Date());

    const dateFiltreValide =
        /^\d{4}-\d{2}-\d{2}$/.test(
            filtreDate
        ) &&
        filtreDate >= aujourdHui;

    // ------------------------------------------------
    // RECHERCHE DES SORTIES
    // ------------------------------------------------

    let sortiesQuery = supabase.rpc(
        "sorties_dans_rayon",
        {
            p_latitude: latitude,
            p_longitude: longitude,
            p_rayon_km: filtreRayon,
        }
    );

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

    // Si une date valide est choisie
    if (dateFiltreValide) {

        // On charge aussi le jour précédent,
        // pour qu'il puisse apparaître à gauche
        // de la date sélectionnée.
        const jourPrecedent =
            ajouterJours(
                filtreDate,
                -1
            );

        const dateRechercheDebut =
            jourPrecedent < aujourdHui
                ? aujourdHui
                : jourPrecedent;

        sortiesQuery = sortiesQuery.gte(
            "date_heure_depart",
            dateRechercheDebut
        );

    } else {

        // Sinon, uniquement les sorties futures
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
    // DEMANDES DE PARTICIPATION DE L'UTILISATEUR
    // ------------------------------------------------

    const {
        data: demandesParticipation,
        error: demandesParticipationError,
    } = await supabase
        .from("demandes_participation")
        .select("sortie_id, utilisateur_id, statut")
        .eq("utilisateur_id", user.id)
        .eq("statut", "en_attente");

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
        demandesParticipationError ||
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
    const listeDemandes = demandesParticipation ?? [];
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

    const dateDebutNavigation =
        dateFiltreValide
            ? (
                ajouterJours(
                    filtreDate,
                    -1
                ) < aujourdHui
                    ? aujourdHui
                    : ajouterJours(
                        filtreDate,
                        -1
                    )
            )
            : aujourdHui;

    // ------------------------------------------------
    // 7 JOURS AFFICHÉS
    // ------------------------------------------------

    const joursNavigation =
        Array.from(
            { length: 7 },
            (_, index) => {

                const date =
                    ajouterJours(
                        dateDebutNavigation,
                        index
                    );

                return {
                    date,
                    disponible:
                        sortiesParJour.has(
                            date
                        ),
                };
            }
        );

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
                <h1 className="text-2xl font-bold">
                    Les sorties
                </h1>
            </div>


            {/* FILTRES REPLIABLES */}

            <details open className="mb-4">

                <summary
                    className="
            cursor-pointer
            select-none
            py-2
            font-medium
        "
                >
                    Filtres
                </summary>

                <div className="pt-2">
                    <FiltresSorties
                        lieuActuel={filtreLieu}
                        rayonActuel={filtreRayon}
                        typeActuel={filtreType}
                        dateActuelle={filtreDate}
                    />
                </div>

            </details>


            {/* Navigation des jours */}
            <NavigationJours
                jours={joursNavigation}
                dateInitiale={
                    dateFiltreValide
                        ? filtreDate
                        : aujourdHui
                }
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
                                    data-jour-sorties={date}
                                    className="scroll-mt-6"
                                >

                                    {/* TITRE DU JOUR */}

                                    <h2 className="border-b pb-2 text-xl font-semibold">
                                        {date === aujourdHui
                                            ? `Aujourd'hui — ${formatDateLongue(date)}`
                                            : date === ajouterJours(
                                                aujourdHui,
                                                1
                                            )
                                                ? `Demain — ${formatDateLongue(date)}`
                                                : formatDateLongue(date)}
                                    </h2>


                                    {/* SORTIES DU JOUR */}

                                    <div>

                                        {sortiesJour.map((sortie) => {

                                            const participationsSortie =
                                                listeParticipations.filter(
                                                    (participation) =>
                                                        participation.sortie_id ===
                                                        sortie.id
                                                );

                                            const nombreActuel =
                                                1 +
                                                participationsSortie.length;


                                            const heureAffichee =
                                                formatHeure(
                                                    sortie.date_heure_depart
                                                );

                                            const [
                                                heureDepart,
                                                minuteDepart,
                                            ] = heureAffichee
                                                .split(":")
                                                .map(Number);

                                            const minuteJour =
                                                heureDepart * 60 +
                                                minuteDepart;


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

                                                    <div className="w-14 shrink-0">
                                                        <p className="font-semibold leading-none">
                                                            {heureAffichee}
                                                        </p>
                                                    </div>


                                                    {/* SORTIE */}

                                                    <div className="min-w-0 flex-1 leading-tight">

                                                        <div className="flex items-center gap-2">

                                                            <h3 className="truncate font-semibold">
                                                                {sortie.titre}
                                                            </h3>

                                                            <span className="shrink-0 text-sm text-gray-500">
                                                                {sortie.type_sortie ===
                                                                    "trail"
                                                                    ? "Trail"
                                                                    : "Route"}
                                                            </span>

                                                        </div>

                                                        <p className="truncate text-sm text-gray-500">
                                                            {sortie.lieu_depart}
                                                        </p>

                                                    </div>


                                                    {/* PARTICIPANTS */}

                                                    <div className="shrink-0 text-sm leading-none">
                                                        {nombreActuel} /{" "}
                                                        {
                                                            sortie.nombre_max_participants
                                                        }
                                                    </div>

                                                </Link>

                                            );
                                        })}

                                    </div>

                                </section>

                            ))}

                        </div>

                    )}

                </div>


                {/* NAVIGATION HORAIRE */}

                <NavigationHeures />

            </div>
        </main>
    );
}