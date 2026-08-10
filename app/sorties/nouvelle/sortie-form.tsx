"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SortieFormProps = {
    userId: string;
};

export default function SortieForm({
    userId,
}: SortieFormProps) {
    const [titre, setTitre] = useState("");
    const [nombreMax, setNombreMax] = useState("2");

    // Date + heure sélectionnées par l'utilisateur
    const [dateHeure, setDateHeure] = useState("");
    const [lieuDepart, setLieuDepart] = useState("");
    const [typeSortie, setTypeSortie] = useState("route");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function creerSortie() {
        setMessage("");

        // Vérification du titre
        if (titre.trim().length < 3) {
            setMessage(
                "Le titre doit contenir au moins 3 caractères."
            );
            return;
        }

        // Vérification du nombre de participants
        const nombre = Number(nombreMax);

        if (nombre < 2 || nombre > 100) {
            setMessage(
                "Le nombre de participants doit être compris entre 2 et 100."
            );
            return;
        }

        // Vérification de la date
        if (!dateHeure) {
            setMessage(
                "Veuillez choisir une date et une heure."
            );
            return;
        }
        if (lieuDepart.trim().length < 2) {
            setMessage(
                "Veuillez indiquer un lieu de départ."
            );
            return;
        }
        setLoading(true);

        // Recherche les coordonnées du lieu de départ
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

        const supabase = createClient();

        const { error } = await supabase
            .from("sorties")
            .insert({
                titre: titre.trim(),
                organisateur_id: userId,
                nombre_max_participants: nombre,

                // Conversion en format reconnu par Supabase
                date_heure_depart:
                    new Date(dateHeure).toISOString(),
                lieu_depart: lieuDepart.trim(),
                type_sortie: typeSortie,
                position_depart:
                    `POINT(${localisation.longitude} ${localisation.latitude})`,
            });

        if (error) {
            setMessage("Erreur : " + error.message);
        } else {
            setMessage("Sortie créée.");

            // Vide le formulaire
            setTitre("");
            setNombreMax("2");
            setDateHeure("");
            setLieuDepart("");
            setTypeSortie("route");
        }

        setLoading(false);
    }

    return (
        <div className="space-y-5">

            <div>
                <label className="mb-1 block font-medium">
                    Titre de la sortie
                </label>

                <input
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    className="w-full rounded border p-2"
                    placeholder="Trail tranquille au Nivolet"
                />
            </div>
            <div>
                <label className="mb-1 block font-medium">
                    Lieu de départ
                </label>

                <input
                    type="text"
                    value={lieuDepart}
                    onChange={(e) => setLieuDepart(e.target.value)}
                    className="w-full rounded border p-2"
                    placeholder="Chambéry"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                    Type de sortie
                </label>

                <select
                    value={typeSortie}
                    onChange={(e) => setTypeSortie(e.target.value)}
                    className="w-full rounded border p-2"
                >
                    <option value="route">Route</option>
                    <option value="trail">Trail</option>
                </select>
            </div>

            <div>
                <label className="mb-1 block font-medium">
                    Date et heure de départ
                </label>

                <input
                    type="datetime-local"
                    value={dateHeure}
                    onChange={(e) => setDateHeure(e.target.value)}
                    className="w-full rounded border p-2"
                />
            </div>


            <div>
                <label className="mb-1 block font-medium">
                    Nombre maximum de participants
                </label>

                <input
                    type="number"
                    value={nombreMax}
                    onChange={(e) => setNombreMax(e.target.value)}
                    className="w-full rounded border p-2"
                    min="2"
                    max="100"
                />

                <p className="mt-1 text-sm text-gray-500">
                    L'organisateur est compris dans ce nombre.
                </p>
            </div>


            <button
                type="button"
                onClick={creerSortie}
                disabled={loading}
                className="rounded bg-black px-4 py-2 text-white"
            >
                {loading
                    ? "Création..."
                    : "Créer la sortie"}
            </button>


            {message && (
                <p>{message}</p>
            )}

        </div>
    );
}