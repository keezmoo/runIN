"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { maintenantDatetimeLocal, } from "@/lib/date-utils";
import {
    TYPES_ENTRAINEMENT,
    INTENSITES,
    validerDonneesSportives,
} from "@/lib/sortie-utils";

export default function SortieForm() {
    const router = useRouter();
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

        const validationSportive =
            validerDonneesSportives({
                typeSortie,
                distanceKm,
                denivelePositif,
                dureeHeures,
                dureeMinutes,
                allureMinutes,
                allureSecondes,
            });

        if (!validationSportive.ok) {
            setMessage(
                validationSportive.message
            );
            return;
        }

        const {
            distance,
            denivele,
            dureeEstimeeMinutes,
            allureSecondesKm,
        } = validationSportive;
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


        const {
            data,
            error,
        } = await supabase.rpc(
            "creer_sortie_securisee",
            {
                p_titre:
                    titre.trim(),

                p_nombre_max_participants:
                    nombre,

                p_date_heure_depart:
                    new Date(
                        dateHeure
                    ).toISOString(),

                p_lieu_depart:
                    lieuDepart.trim(),

                p_type_sortie:
                    typeSortie,

                p_longitude:
                    localisation.longitude,

                p_latitude:
                    localisation.latitude,

                p_mode_inscription:
                    modeInscription,

                p_type_entrainement:
                    typeEntrainement,

                p_distance_km:
                    distance,

                p_denivele_positif_m:
                    denivele,

                p_duree_estimee_minutes:
                    dureeEstimeeMinutes,

                p_intensite:
                    intensite,

                p_allure_secondes_km:
                    typeSortie === "route"
                        ? allureSecondesKm
                        : null,

                p_description:
                    description.trim() || null,
            }
        );


        if (error) {

            console.error(
                "Erreur création sortie :",
                error
            );

            setMessage(
                "Impossible de créer la sortie."
            );

            setLoading(false);

            return;
        }


        const resultat =
            data as {
                statut?: string;
                sortie_id?: string;
                secondes_restantes?: number;
            } | null;


        // ------------------------------------------------
        // ANTI-SPAM
        // ------------------------------------------------

        if (
            resultat?.statut ===
            "BLOQUEE"
        ) {

            const secondes =
                resultat.secondes_restantes ??
                3600;

            const minutes =
                Math.max(
                    1,
                    Math.ceil(
                        secondes / 60
                    )
                );


            if (minutes >= 60) {

                setMessage(
                    "Vous avez créé trop de sorties en peu de temps. Nouvelle création possible dans environ 1 heure."
                );

            } else {

                setMessage(
                    `Vous avez créé trop de sorties en peu de temps. Nouvelle création possible dans ${minutes} min.`
                );

            }


            setLoading(false);

            return;
        }


        // ------------------------------------------------
        // SORTIE CRÉÉE
        // ------------------------------------------------

        if (
            resultat?.statut !==
            "CREEE" ||
            !resultat.sortie_id
        ) {

            setMessage(
                "La sortie n'a pas pu être créée."
            );

            setLoading(false);

            return;
        }


        router.replace(
            `/sorties/${resultat.sortie_id}`
        );

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
                <p className="mt-1 text-sm font-normal text-gray-500">
                    Données de localisation © contributeurs OpenStreetMap
                </p>
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
                    {TYPES_ENTRAINEMENT.map(
                        (type) => (
                            <option
                                key={type.value}
                                value={type.value}
                            >
                                {type.label}
                            </option>
                        )
                    )}
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
                    {INTENSITES.map(
                        (item) => (
                            <label
                                key={item.value}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="radio"
                                    name="intensite"
                                    value={item.value}
                                    checked={
                                        intensite ===
                                        item.value
                                    }
                                    onChange={(e) =>
                                        setIntensite(
                                            e.target.value
                                        )
                                    }
                                />

                                {item.label}
                            </label>
                        )
                    )}
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
