import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SupprimerSortieButton from "./supprimer-sortie-button";

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
        nombre_max_participants
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
          nombre_max_participants
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
    // ERREURS
    // ------------------------------------------------

    if (
        sortiesOrganiseesError ||
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
        sortiesOrganisees ?? [];

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
        },
        estOrganisateur: boolean
    ) {
        const dateKey = getDateKey(
            new Date(sortie.date_heure_depart)
        );

        return (
            <div
                key={sortie.id}
                className="rounded border p-4"
            >
                <h3 className="text-lg font-semibold">
                    {sortie.titre}
                </h3>

                <p className="mt-1 text-sm font-medium">
                    {sortie.type_sortie === "trail"
                        ? "Trail"
                        : "Route"}
                </p>

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
                {estOrganisateur && (
                    <div className="mt-4 flex gap-3">

                        <Link
                            href={`/sorties/${sortie.id}/modifier`}
                            className="rounded border px-4 py-2"
                        >
                            Modifier
                        </Link>

                        <SupprimerSortieButton
                            sortieId={sortie.id}
                            titre={sortie.titre}
                        />

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
                        {sortiesParticipees.map(
                            (sortie) =>
                                afficherSortie(sortie, false)
                        )}
                    </div>
                )}

            </section>

        </main>
    );
}