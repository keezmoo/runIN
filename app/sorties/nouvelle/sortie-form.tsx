"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SortieFormProps = {
    userId: string;
};

function maintenantDatetimeLocal() {
    const maintenant = new Date();

    const decalage =
        maintenant.getTimezoneOffset() *
        60 *
        1000;

    return new Date(
        maintenant.getTime() - decalage
    )
        .toISOString()
        .slice(0, 16);
}

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
    const [modeInscription, setModeInscription] = useState("automatique");
    const [typeEntrainement, setTypeEntrainement] = useState("endurance_fondamentale");
    const [distanceKm, setDistanceKm] = useState("");
    const [denivelePositif, setDenivelePositif] = useState("");
    const [dureeHeures, setDureeHeures] = useState("");
    const [dureeMinutes, setDureeMinutes] = useState("");
    const [intensite, setIntensite] = useState("moderee");
    const [allureMinutes, setAllureMinutes] = useState("");
    const [allureSecondes, setAllureSecondes] = useState("");
    const [description, setDescription] = useState("");



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


        const dateDepart =
            new Date(dateHeure);

        if (
            Number.isNaN(dateDepart.getTime()) ||
            dateDepart <= new Date()
        ) {
            setMessage(
                "La date et l'heure de départ doivent être dans le futur."
            );
            return;
        }

        if (lieuDepart.trim().length < 2) {
            setMessage(
                "Veuillez indiquer un lieu de départ."
            );
            return;
        }


        // ------------------------------------------------
        // DONNÉES SPORTIVES
        // ------------------------------------------------

        const distance =
            Number(
                distanceKm.replace(",", ".")
            );

        const denivele =
            Number(denivelePositif);

        const heures =
            Number(dureeHeures || 0);

        const minutes =
            Number(dureeMinutes || 0);


        // Distance
        if (
            !Number.isFinite(distance) ||
            distance <= 0
        ) {
            setMessage(
                "La distance doit être supérieure à 0."
            );
            return;
        }


        // Dénivelé
        if (
            !Number.isInteger(denivele) ||
            denivele < 0
        ) {
            setMessage(
                "Le dénivelé doit être égal ou supérieur à 0."
            );
            return;
        }


        // Durée
        if (
            !Number.isInteger(heures) ||
            heures < 0 ||
            !Number.isInteger(minutes) ||
            minutes < 0 ||
            minutes > 59
        ) {
            setMessage(
                "La durée indiquée n'est pas valide."
            );
            return;
        }

        const dureeEstimeeMinutes =
            heures * 60 + minutes;

        if (dureeEstimeeMinutes <= 0) {
            setMessage(
                "La durée de la sortie doit être supérieure à 0."
            );
            return;
        }


        // ------------------------------------------------
        // ALLURE - ROUTE UNIQUEMENT
        // ------------------------------------------------

        let allureSecondesKm:
            number | null = null;

        if (
            typeSortie === "route" &&
            (
                allureMinutes !== "" ||
                allureSecondes !== ""
            )
        ) {
            const allureMin =
                Number(allureMinutes);

            const allureSec =
                Number(allureSecondes);

            if (
                !Number.isInteger(allureMin) ||
                allureMin < 0 ||
                !Number.isInteger(allureSec) ||
                allureSec < 0 ||
                allureSec > 59
            ) {
                setMessage(
                    "L'allure indiquée n'est pas valide."
                );
                return;
            }

            allureSecondesKm =
                allureMin * 60 + allureSec;

            if (allureSecondesKm <= 0) {
                setMessage(
                    "L'allure indiquée n'est pas valide."
                );
                return;
            }
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
                date_heure_depart:
                    new Date(dateHeure).toISOString(),
                lieu_depart: lieuDepart.trim(),
                type_sortie: typeSortie,
                position_depart:
                    `POINT(${localisation.longitude} ${localisation.latitude})`,
                type_entrainement:
                    typeEntrainement,

                distance_km:
                    distance,

                denivele_positif_m:
                    denivele,

                duree_estimee_minutes:
                    dureeEstimeeMinutes,

                intensite:
                    intensite,

                allure_secondes_km:
                    typeSortie === "route"
                        ? allureSecondesKm
                        : null,

                description:
                    description.trim() || null,
                mode_inscription: modeInscription,
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

            setTypeEntrainement("endurance_fondamentale");
            setDistanceKm("");
            setDenivelePositif("");
            setDureeHeures("");
            setDureeMinutes("");
            setIntensite("moderee");
            setAllureMinutes("");
            setAllureSecondes("");
            setDescription("");
            setModeInscription("automatique");
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
                    onChange={(e) =>
                        setDateHeure(e.target.value)
                    }
                    min={maintenantDatetimeLocal()}
                    className="w-full rounded border p-2"
                />
            </div>

            <div>
                <label className="mb-1 block font-medium">
                    Type d&apos;entraînement
                </label>

                <select
                    value={typeEntrainement}
                    onChange={(e) =>
                        setTypeEntrainement(
                            e.target.value
                        )
                    }
                    className="w-full rounded border p-2"
                    required
                >
                    <option value="endurance_fondamentale">
                        Endurance fondamentale
                    </option>

                    <option value="sortie_longue">
                        Sortie longue
                    </option>

                    <option value="tempo_seuil">
                        Tempo / seuil
                    </option>

                    <option value="fractionne">
                        Fractionné
                    </option>

                    <option value="cotes">
                        Côtes
                    </option>

                    <option value="recuperation">
                        Récupération
                    </option>

                    <option value="libre">
                        Sortie libre
                    </option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">

                <div>
                    <label className="mb-1 block font-medium">
                        Distance
                    </label>

                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            inputMode="decimal"
                            value={distanceKm}
                            onChange={(e) =>
                                setDistanceKm(
                                    e.target.value
                                )
                            }
                            className="w-full rounded border p-2"
                            required
                        />

                        <span>km</span>
                    </div>
                </div>


                <div>
                    <label className="mb-1 block font-medium">
                        Dénivelé positif
                    </label>

                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={denivelePositif}
                            onChange={(e) =>
                                setDenivelePositif(
                                    e.target.value
                                )
                            }
                            className="w-full rounded border p-2"
                            required
                        />

                        <span>m D+</span>
                    </div>
                </div>

            </div>

            <div>
                <label className="mb-1 block font-medium">
                    Durée estimée
                </label>

                <div className="flex items-center gap-2">

                    <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="1"
                        value={dureeHeures}
                        onChange={(e) =>
                            setDureeHeures(
                                e.target.value
                            )
                        }
                        className="w-20 rounded border p-2"
                    />

                    <span>h</span>

                    <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        placeholder="30"
                        value={dureeMinutes}
                        onChange={(e) =>
                            setDureeMinutes(
                                e.target.value
                            )
                        }
                        className="w-20 rounded border p-2"
                    />

                    <span>min</span>

                </div>
            </div>

            <div>
                <p className="mb-2 font-medium">
                    Intensité
                </p>

                <div className="space-y-2">

                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="intensite"
                            value="tranquille"
                            checked={
                                intensite ===
                                "tranquille"
                            }
                            onChange={(e) =>
                                setIntensite(
                                    e.target.value
                                )
                            }
                        />

                        Tranquille
                    </label>


                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="intensite"
                            value="moderee"
                            checked={
                                intensite ===
                                "moderee"
                            }
                            onChange={(e) =>
                                setIntensite(
                                    e.target.value
                                )
                            }
                        />

                        Modérée
                    </label>


                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="intensite"
                            value="soutenue"
                            checked={
                                intensite ===
                                "soutenue"
                            }
                            onChange={(e) =>
                                setIntensite(
                                    e.target.value
                                )
                            }
                        />

                        Soutenue
                    </label>

                </div>
            </div>

            {typeSortie === "route" && (
                <div>
                    <label className="mb-1 block font-medium">
                        Allure prévue
                        <span className="ml-1 text-sm font-normal text-gray-500">
                            (facultatif)
                        </span>
                    </label>

                    <div className="flex items-center gap-2">

                        <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="5"
                            value={allureMinutes}
                            onChange={(e) =>
                                setAllureMinutes(
                                    e.target.value
                                )
                            }
                            className="w-20 rounded border p-2"
                        />

                        <span>:</span>

                        <input
                            type="number"
                            min="0"
                            max="59"
                            step="1"
                            placeholder="30"
                            value={allureSecondes}
                            onChange={(e) =>
                                setAllureSecondes(
                                    e.target.value
                                )
                            }
                            className="w-20 rounded border p-2"
                        />

                        <span>/ km</span>

                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                        Exemple : 5:30 / km
                    </p>
                </div>
            )}

            <div>
                <label className="mb-1 block font-medium">
                    Description
                    <span className="ml-1 text-sm font-normal text-gray-500">
                        (facultatif)
                    </span>
                </label>

                <textarea
                    value={description}
                    onChange={(e) =>
                        setDescription(
                            e.target.value
                        )
                    }
                    maxLength={1000}
                    rows={5}
                    placeholder="Décris la sortie, le parcours, l'objectif de l'entraînement, les éventuelles pauses..."
                    className="w-full rounded border p-2"
                />

                <p className="mt-1 text-sm text-gray-500">
                    {description.length} / 1000
                </p>
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
            <div>
                <label className="mb-2 block font-medium">
                    Inscription des participants
                </label>

                <div className="space-y-3">

                    <label className="flex cursor-pointer gap-3 rounded border p-3">
                        <input
                            type="radio"
                            name="modeInscription"
                            value="automatique"
                            checked={modeInscription === "automatique"}
                            onChange={(e) =>
                                setModeInscription(e.target.value)
                            }
                        />

                        <div>
                            <p className="font-medium">
                                Inscription automatique
                            </p>

                            <p className="text-sm text-gray-500">
                                Toute personne qui clique sur Participer
                                rejoint immédiatement la sortie.
                            </p>
                        </div>
                    </label>


                    <label className="flex cursor-pointer gap-3 rounded border p-3">
                        <input
                            type="radio"
                            name="modeInscription"
                            value="validation"
                            checked={modeInscription === "validation"}
                            onChange={(e) =>
                                setModeInscription(e.target.value)
                            }
                        />

                        <div>
                            <p className="font-medium">
                                Validation par l&apos;organisateur
                            </p>

                            <p className="text-sm text-gray-500">
                                Vous acceptez ou refusez chaque demande
                                avant que la personne rejoigne la sortie.
                            </p>
                        </div>
                    </label>

                </div>
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