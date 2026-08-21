
export const TYPES_ENTRAINEMENT = [
    {
        value: "endurance_fondamentale",
        label: "Endurance fondamentale",
    },
    {
        value: "sortie_longue",
        label: "Sortie longue",
    },
    {
        value: "tempo_seuil",
        label: "Tempo / seuil",
    },
    {
        value: "fractionne",
        label: "Fractionné",
    },
    {
        value: "cotes",
        label: "Côtes",
    },
    {
        value: "recuperation",
        label: "Récupération",
    },
    {
        value: "libre",
        label: "Sortie libre",
    },
] as const;

export const INTENSITES = [
    {
        value: "tranquille",
        label: "Tranquille",
    },
    {
        value: "moderee",
        label: "Modérée",
    },
    {
        value: "soutenue",
        label: "Soutenue",
    },
] as const;

// ------------------------------------------------
// TYPE D'ENTRAÎNEMENT
// ------------------------------------------------

export function afficherTypeEntrainement(
    type: string | null
) {
    if (!type) {
        return null;
    }

    return (
        TYPES_ENTRAINEMENT.find(
            (item) => item.value === type
        )?.label ?? null
    );
}


// ------------------------------------------------
// INTENSITÉ
// ------------------------------------------------

export function afficherIntensite(
    intensite: string | null
) {
    if (!intensite) {
        return null;
    }

    return (
        INTENSITES.find(
            (item) =>
                item.value === intensite
        )?.label ?? null
    );
}


// ------------------------------------------------
// DURÉE
// ------------------------------------------------

export function afficherDuree(
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


// ------------------------------------------------
// ALLURE
// ------------------------------------------------

export function afficherAllure(
    totalSecondes: number
) {
    const minutes =
        Math.floor(totalSecondes / 60);

    const secondes =
        totalSecondes % 60;

    return `${minutes}:${String(secondes).padStart(2, "0")} /km`;
}

// ------------------------------------------------
// VALIDATION DES DONNÉES SPORTIVES
// ------------------------------------------------

type ValidationDonneesSportivesParams = {
    typeSortie: string;
    distanceKm: string;
    denivelePositif: string;
    dureeHeures: string;
    dureeMinutes: string;
    allureMinutes: string;
    allureSecondes: string;
};


type ValidationDonneesSportivesResultat =
    | {
        ok: true;
        distance: number;
        denivele: number | null;
        dureeEstimeeMinutes: number | null;
        allureSecondesKm: number | null;
    }
    | {
        ok: false;
        message: string;
    };


export function validerDonneesSportives({
    typeSortie,
    distanceKm,
    denivelePositif,
    dureeHeures,
    dureeMinutes,
    allureMinutes,
    allureSecondes,
}: ValidationDonneesSportivesParams):
    ValidationDonneesSportivesResultat {

    // ------------------------------------------------
    // DISTANCE
    // Obligatoire pour Route et Trail
    // ------------------------------------------------

    const distance =
        Number(
            distanceKm.replace(",", ".")
        );

    if (
        distanceKm.trim() === "" ||
        !Number.isFinite(distance) ||
        distance <= 0
    ) {
        return {
            ok: false,
            message:
                "La distance doit être supérieure à 0.",
        };
    }


    // ------------------------------------------------
    // DÉNIVELÉ
    //
    // Trail : obligatoire
    // Route : facultatif
    // ------------------------------------------------

    let denivele: number | null = null;

    if (denivelePositif.trim() !== "") {

        const valeurDenivele =
            Number(denivelePositif);

        if (
            !Number.isInteger(valeurDenivele) ||
            valeurDenivele < 0
        ) {
            return {
                ok: false,
                message:
                    "Le dénivelé doit être égal ou supérieur à 0.",
            };
        }

        denivele = valeurDenivele;

    } else if (typeSortie === "trail") {

        return {
            ok: false,
            message:
                "Veuillez indiquer le dénivelé positif pour une sortie trail.",
        };
    }


    // ------------------------------------------------
    // DURÉE TOTALE ESTIMÉE
    // Facultative pour Route et Trail
    // ------------------------------------------------

    let dureeEstimeeMinutes:
        number | null = null;

    const dureeRenseignee =
        dureeHeures.trim() !== "" ||
        dureeMinutes.trim() !== "";

    if (dureeRenseignee) {

        const heures =
            Number(dureeHeures || 0);

        const minutes =
            Number(dureeMinutes || 0);

        if (
            !Number.isInteger(heures) ||
            heures < 0 ||
            !Number.isInteger(minutes) ||
            minutes < 0 ||
            minutes > 59
        ) {
            return {
                ok: false,
                message:
                    "La durée indiquée n'est pas valide.",
            };
        }

        const totalMinutes =
            heures * 60 + minutes;

        if (totalMinutes <= 0) {
            return {
                ok: false,
                message:
                    "La durée indiquée n'est pas valide.",
            };
        }

        dureeEstimeeMinutes =
            totalMinutes;
    }


    // ------------------------------------------------
    // ALLURE
    //
    // Route : obligatoire
    // Trail : facultative
    // ------------------------------------------------

    let allureSecondesKm:
        number | null = null;

    const allureRenseignee =
        allureMinutes.trim() !== "" ||
        allureSecondes.trim() !== "";


    if (
        typeSortie === "route" &&
        !allureRenseignee
    ) {
        return {
            ok: false,
            message:
                "Veuillez indiquer l'allure moyenne prévue pour une sortie route.",
        };
    }


    if (allureRenseignee) {

        const allureMin =
            Number(allureMinutes || 0);

        const allureSec =
            Number(allureSecondes || 0);

        if (
            !Number.isInteger(allureMin) ||
            allureMin < 0 ||
            !Number.isInteger(allureSec) ||
            allureSec < 0 ||
            allureSec > 59
        ) {
            return {
                ok: false,
                message:
                    "L'allure indiquée n'est pas valide.",
            };
        }

        const totalSecondes =
            allureMin * 60 + allureSec;

        if (totalSecondes <= 0) {
            return {
                ok: false,
                message:
                    "L'allure indiquée n'est pas valide.",
            };
        }

        allureSecondesKm =
            totalSecondes;
    }

    // IMPORTANT : retour final de la fonction
return {
    ok: true,
    distance,
    denivele,
    dureeEstimeeMinutes,
    allureSecondesKm,
};
}