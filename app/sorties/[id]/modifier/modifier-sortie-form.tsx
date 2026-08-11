"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Sortie = {
    id: string;
    titre: string;
    nombre_max_participants: number;
    date_heure_depart: string;
    lieu_depart: string;
    type_sortie: string;
};

type ModifierSortieFormProps = {
    sortie: Sortie;
    nombreParticipants: number;
};

function versDatetimeLocal(
    dateISO: string
) {
    const date = new Date(dateISO);

    const decalage =
        date.getTimezoneOffset() * 60 * 1000;

    return new Date(
        date.getTime() - decalage
    )
        .toISOString()
        .slice(0, 16);
}

export default function ModifierSortieForm({
    sortie,
    nombreParticipants,
}: ModifierSortieFormProps) {
    const supabase = createClient();
    const router = useRouter();

    const [titre, setTitre] = useState(
        sortie.titre
    );

    const [lieuDepart, setLieuDepart] =
        useState(sortie.lieu_depart);

    const [dateHeure, setDateHeure] =
        useState(
            versDatetimeLocal(
                sortie.date_heure_depart
            )
        );

    const [
        nombreMaxParticipants,
        setNombreMaxParticipants,
    ] = useState(
        sortie.nombre_max_participants.toString()
    );

    const [typeSortie, setTypeSortie] =
        useState(sortie.type_sortie);

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    async function modifierSortie() {
        setMessage("");

        if (titre.trim().length < 3) {
            setMessage(
                "Le titre doit contenir au moins 3 caractères."
            );
            return;
        }

        if (lieuDepart.trim().length < 2) {
            setMessage(
                "Veuillez indiquer un lieu de départ."
            );
            return;
        }

        if (!dateHeure) {
            setMessage(
                "Veuillez indiquer une date et une heure."
            );
            return;
        }

        const nombreMax =
            Number(nombreMaxParticipants);

        if (
            nombreMax < nombreParticipants ||
            nombreMax > 100
        ) {
            setMessage(
                `Le nombre maximum doit être compris entre ${nombreParticipants} et 100.`
            );
            return;
        }

        setLoading(true);

        // Recalcule la position géographique
        const geocodeResponse = await fetch(
            `/api/geocode?q=${encodeURIComponent(
                lieuDepart.trim()
            )}`
        );

        if (!geocodeResponse.ok) {
            setMessage(
                "Impossible de trouver le lieu de départ."
            );
            setLoading(false);
            return;
        }

        const localisation =
            await geocodeResponse.json();

        const { error } = await supabase
            .from("sorties")
            .update({
                titre: titre.trim(),

                lieu_depart:
                    lieuDepart.trim(),

                position_depart:
                    `POINT(${localisation.longitude} ${localisation.latitude})`,

                date_heure_depart:
                    new Date(
                        dateHeure
                    ).toISOString(),

                type_sortie:
                    typeSortie,

                nombre_max_participants:
                    nombreMax,
            })
            .eq("id", sortie.id);

        if (error) {
            setMessage(
                "Impossible de modifier la sortie."
            );
            setLoading(false);
            return;
        }

        router.push("/mes-sorties");
        router.refresh();
    }

    return (
        <div className="space-y-5">

            <div>
                <label className="mb-1 block">
                    Titre
                </label>

                <input
                    type="text"
                    value={titre}
                    onChange={(e) =>
                        setTitre(e.target.value)
                    }
                    className="w-full rounded border p-2"
                />
            </div>


            <div>
                <label className="mb-1 block">
                    Lieu de départ
                </label>

                <input
                    type="text"
                    value={lieuDepart}
                    onChange={(e) =>
                        setLieuDepart(e.target.value)
                    }
                    className="w-full rounded border p-2"
                />
            </div>


            <div>
                <label className="mb-1 block">
                    Date et heure
                </label>

                <input
                    type="datetime-local"
                    value={dateHeure}
                    onChange={(e) =>
                        setDateHeure(e.target.value)
                    }
                    className="w-full rounded border p-2"
                />
            </div>


            <div>
                <label className="mb-1 block">
                    Type de sortie
                </label>

                <select
                    value={typeSortie}
                    onChange={(e) =>
                        setTypeSortie(e.target.value)
                    }
                    className="w-full rounded border p-2"
                >
                    <option value="route">
                        Route
                    </option>

                    <option value="trail">
                        Trail
                    </option>
                </select>
            </div>


            <div>
                <label className="mb-1 block">
                    Nombre maximum de participants
                </label>

                <input
                    type="number"
                    min={nombreParticipants}
                    max="100"
                    value={nombreMaxParticipants}
                    onChange={(e) =>
                        setNombreMaxParticipants(
                            e.target.value
                        )
                    }
                    className="w-full rounded border p-2"
                />

                <p className="mt-1 text-sm text-gray-500">
                    {nombreParticipants} participant
                    {nombreParticipants > 1
                        ? "s"
                        : ""}{" "}
                    actuellement.
                </p>
            </div>


            <button
                type="button"
                onClick={modifierSortie}
                disabled={loading}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
            >
                {loading
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
            </button>


            {message && (
                <p className="text-sm">
                    {message}
                </p>
            )}

        </div>
    );
}