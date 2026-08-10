import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ParticiperButton from "./participer-button";
import FiltresSorties from "./filtres-sorties";

type SortiesPageProps = {
    searchParams: Promise<{
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

    // Récupère les sorties
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

    // Filtre Route / Trail
    if (
        filtreType === "route" ||
        filtreType === "trail"
    ) {
        sortiesQuery = sortiesQuery.eq(
            "type_sortie",
            filtreType
        );
    }

    // Filtre par date
    if (filtreDate) {
        sortiesQuery = sortiesQuery.gte(
            "date_heure_depart",
            filtreDate
        );
    }

    // Les sorties les plus proches dans le temps d'abord
    sortiesQuery = sortiesQuery.order(
        "date_heure_depart",
        { ascending: true }
    );

    const {
        data: sorties,
        error: sortiesError,
    } = await sortiesQuery;

    // Récupère les participations
    const { data: participations, error: participationsError } =
        await supabase
            .from("participations")
            .select("sortie_id, utilisateur_id");

    // Récupère les profils pour connaître le nom des organisateurs
    const { data: profils, error: profilsError } = await supabase
        .from("profiles")
        .select("id, nom");

    if (
        sortiesError ||
        participationsError ||
        profilsError
    ) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>Erreur lors du chargement des sorties.</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl p-6">

            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    Les sorties
                </h1>

                <Link
                    href="/sorties/nouvelle"
                    className="rounded bg-black px-4 py-2 text-white">
                    Créer une sortie
                </Link>
            </div>

            <FiltresSorties
                typeActuel={filtreType}
                dateActuelle={filtreDate}
            />

            {sorties.length === 0 ? (
                <p>Aucune sortie pour le moment.</p>
            ) : (
                <div className="space-y-4">

                    {sorties.map((sortie) => {

                        // Recherche le profil de l'organisateur
                        const organisateur = profils.find(
                            (profil) =>
                                profil.id === sortie.organisateur_id
                        );

                        // Participations de cette sortie
                        const participationsSortie =
                            participations.filter(
                                (participation) =>
                                    participation.sortie_id === sortie.id
                            );

                        // L'organisateur compte comme première personne
                        const nombreActuel =
                            1 + participationsSortie.length;

                        // L'utilisateur est-il déjà inscrit ?
                        const dejaParticipant =
                            participationsSortie.some(
                                (participation) =>
                                    participation.utilisateur_id === user.id
                            );

                        // Est-ce sa propre sortie ?
                        const estOrganisateur =
                            sortie.organisateur_id === user.id;

                        // La sortie est-elle complète ?
                        const complet =
                            nombreActuel >=
                            sortie.nombre_max_participants;

                        return (
                            <div
                                key={sortie.id}
                                className="rounded border p-4"
                            >
                                <h2 className="text-lg font-semibold">
                                    {sortie.titre}
                                </h2>

                                <p className="mt-1 text-sm font-medium">
                                    {sortie.type_sortie === "trail" ? "Trail" : "Route"}
                                </p>

                                <p className="mt-2">
                                    {new Intl.DateTimeFormat("fr-FR", {
                                        dateStyle: "full",
                                        timeStyle: "short",
                                        timeZone: "Europe/Paris",
                                    }).format(
                                        new Date(sortie.date_heure_depart)
                                    )}
                                </p>

                                <p className="mt-1">
                                    Départ : {sortie.lieu_depart}
                                </p>

                                <p className="mt-1 text-sm">
                                    Organisé par{" "}
                                    <Link
                                        href={`/membres/${sortie.organisateur_id}`}
                                        className="font-medium underline"
                                    >
                                        {organisateur?.nom ?? "Utilisateur"}
                                    </Link>
                                </p>

                                <p className="mt-2">
                                    {nombreActuel} /{" "}
                                    {sortie.nombre_max_participants} participants
                                </p>

                                <div className="mt-4">
                                    <ParticiperButton
                                        sortieId={sortie.id}
                                        userId={user.id}
                                        nombreMax={sortie.nombre_max_participants}
                                        dejaParticipant={dejaParticipant}
                                        estOrganisateur={estOrganisateur}
                                        complet={complet}
                                    />
                                </div>
                            </div>
                        );
                    })}

                </div>
            )}

        </main>
    );
}