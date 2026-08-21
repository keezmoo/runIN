"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maintenantDatetimeLocal, } from "@/lib/date-utils";
import {
    TYPES_ENTRAINEMENT,
    INTENSITES,
    validerDonneesSportives,
} from "@/lib/sortie-utils";

type Sortie = {
    id: string;
    titre: string;
    nombre_max_participants: number;
    date_heure_depart: string;
    lieu_depart: string;
    type_sortie: string;
    mode_inscription: string;

    type_entrainement: string | null;
    distance_km: number | null;
    denivele_positif_m: number | null;
    duree_estimee_minutes: number | null;
    intensite: string | null;
    allure_secondes_km: number | null;
    description: string | null;
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


    // ------------------------------------------------
    // VALEURS INITIALES
    // ------------------------------------------------

    const dureeInitiale =
        sortie.duree_estimee_minutes;

    const allureInitiale =
        sortie.allure_secondes_km;


    // ------------------------------------------------
    // INFORMATIONS GÉNÉRALES
    // ------------------------------------------------

    const [titre, setTitre] =
        useState(sortie.titre);

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

    const [modeInscription, setModeInscription] =
        useState(sortie.mode_inscription);


    // ------------------------------------------------
    // DONNÉES SPORTIVES
    // ------------------------------------------------

    const [typeEntrainement, setTypeEntrainement] =
        useState(
            sortie.type_entrainement ??
            "endurance_fondamentale"
        );

    const [distanceKm, setDistanceKm] =
        useState(
            sortie.distance_km !== null
                ? String(sortie.distance_km)
                : ""
        );

    const [denivelePositif, setDenivelePositif] =
        useState(
            sortie.denivele_positif_m !== null
                ? String(sortie.denivele_positif_m)
                : ""
        );

    const [dureeHeures, setDureeHeures] =
        useState(
            dureeInitiale !== null
                ? String(
                    Math.floor(
                        dureeInitiale / 60
                    )
                )
                : ""
        );

    const [dureeMinutes, setDureeMinutes] =
        useState(
            dureeInitiale !== null
                ? String(
                    dureeInitiale % 60
                )
                : ""
        );

    const [intensite, setIntensite] =
        useState(
            sortie.intensite ??
            "moderee"
        );

    const [allureMinutes, setAllureMinutes] =
        useState(
            allureInitiale !== null
                ? String(
                    Math.floor(
                        allureInitiale / 60
                    )
                )
                : ""
        );

    const [allureSecondes, setAllureSecondes] =
        useState(
            allureInitiale !== null
                ? String(
                    allureInitiale % 60
                )
                : ""
        );

    const [description, setDescription] =
        useState(
            sortie.description ?? ""
        );


    // ------------------------------------------------
    // ÉTAT DE L'INTERFACE
    // ------------------------------------------------

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
                    allureSecondesKm,

                description:
                    description.trim() || null,

                nombre_max_participants:
                    nombreMax,

                mode_inscription: modeInscription,
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
                    min={maintenantDatetimeLocal()}
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
                        Durée totale estimée
                        <span className="ml-1 text-sm font-normal text-gray-500">
                            (facultatif)
                        </span>
                    </label>

                    <p className="mb-2 text-sm text-gray-500">
                        Temps global prévu pour la sortie, pauses et arrêts compris.
                    </p>

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


            <div>
                <label className="mb-1 block font-medium">
                    Allure moyenne prévue

                    {typeSortie === "trail" ? (
                        <span className="ml-1 text-sm font-normal text-gray-500">
                            (facultatif)
                        </span>
                    ) : (
                        <span className="ml-1 text-sm font-normal text-gray-500">
                            *
                        </span>
                    )}
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
                    Allure moyenne envisagée sur l&apos;ensemble de la sortie.
                    Exemple : 5:30 / km
                </p>
            </div>


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
                            checked={
                                modeInscription === "automatique"
                            }
                            onChange={(e) =>
                                setModeInscription(
                                    e.target.value
                                )
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
                            checked={
                                modeInscription === "validation"
                            }
                            onChange={(e) =>
                                setModeInscription(
                                    e.target.value
                                )
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