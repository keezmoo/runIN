"use client";

import {
    useEffect,
    useState,
} from "react";


const HEURES = Array.from(
    { length: 24 },
    (_, index) => index
);


export default function NavigationHeures() {

    const [
        heureActive,
        setHeureActive,
    ] = useState<number | null>(null);

    const [
        jourActif,
        setJourActif,
    ] = useState<string | null>(
        null
    );

    // ------------------------------------------------
    // JOUR ACTIF ENVOYÉ PAR LA NAVIGATION DES JOURS
    // ------------------------------------------------

    useEffect(() => {

        function changementJour(
            event: Event
        ) {

            const evenement =
                event as CustomEvent<{
                    date: string;
                }>;

            setJourActif(
                evenement.detail.date
            );
        }


        window.addEventListener(
            "runin:jour-actif",
            changementJour
        );


        return () => {

            window.removeEventListener(
                "runin:jour-actif",
                changementJour
            );

        };

    }, []);

    // ------------------------------------------------
    // JOUR ACTUELLEMENT AFFICHÉ
    // ------------------------------------------------

    function trouverJourActif(
        conteneur: HTMLElement
    ) {

        // ------------------------------------------------
        // PRIORITÉ AU JOUR SOULIGNÉ
        // ------------------------------------------------

        if (jourActif) {

            const section =
                document.getElementById(
                    `jour-${jourActif}`
                );

            if (section) {
                return section;
            }

        }


        // ------------------------------------------------
        // SINON : PREMIÈRE SORTIE VISIBLE
        // ------------------------------------------------

        const lignes =
            Array.from(
                conteneur.querySelectorAll<HTMLElement>(
                    "[data-minute-depart]"
                )
            );

        const conteneurRect =
            conteneur.getBoundingClientRect();


        const premiereVisible =
            lignes.find(
                (ligne) =>
                    ligne
                        .getBoundingClientRect()
                        .bottom >
                    conteneurRect.top + 2
            );


        if (!premiereVisible) {
            return null;
        }


        return (
            premiereVisible.closest<HTMLElement>(
                "[data-jour-sorties]"
            )
        );
    }


    // ------------------------------------------------
    // ALLER À UNE HEURE
    // ------------------------------------------------

    function allerAHeure(
        heure: number
    ) {

        const conteneur =
            document.getElementById(
                "liste-sorties-scroll"
            );

        if (!conteneur) {
            return;
        }

        const jour =
            trouverJourActif(conteneur);

        if (!jour) {
            return;
        }

        const lignes = Array.from(
            jour.querySelectorAll<HTMLElement>(
                "[data-minute-depart]"
            )
        );

        if (lignes.length === 0) {
            return;
        }

        const minuteCible =
            heure * 60;

        const cible =
            lignes.find(
                (ligne) =>
                    Number(
                        ligne.dataset.minuteDepart
                    ) >= minuteCible
            );

        const conteneurRect =
            conteneur.getBoundingClientRect();


        // Première sortie après l'heure choisie
        if (cible) {

            const cibleRect =
                cible.getBoundingClientRect();

            conteneur.scrollTo({
                top:
                    conteneur.scrollTop +
                    cibleRect.top -
                    conteneurRect.top,
                behavior: "smooth",
            });

        } else {

            // Plus aucune sortie après cette heure :
            // on va à la fin du jour.

            const jourRect =
                jour.getBoundingClientRect();

            conteneur.scrollTo({
                top:
                    conteneur.scrollTop +
                    jourRect.bottom -
                    conteneurRect.bottom,
                behavior: "smooth",
            });

        }

        setHeureActive(heure);
    }


    // ------------------------------------------------
    // SUIVRE LE SCROLL
    // ------------------------------------------------

    useEffect(() => {

        const conteneur =
            document.getElementById(
                "liste-sorties-scroll"
            );

        if (!conteneur) {
            return;
        }


        function mettreAJour() {

            const jour =
                trouverJourActif(conteneur!);

            if (!jour) {
                return;
            }

            const lignes = Array.from(
                jour.querySelectorAll<HTMLElement>(
                    "[data-minute-depart]"
                )
            );

            if (lignes.length === 0) {
                return;
            }

            const conteneurRect =
                conteneur!.getBoundingClientRect();

            const premiereVisible =
                lignes.find(
                    (ligne) =>
                        ligne
                            .getBoundingClientRect()
                            .bottom >
                        conteneurRect.top + 5
                );

            if (!premiereVisible) {
                return;
            }

            const minutes =
                Number(
                    premiereVisible.dataset
                        .minuteDepart
                );

            setHeureActive(
                Math.floor(minutes / 60)
            );
        }


        mettreAJour();

        conteneur.addEventListener(
            "scroll",
            mettreAJour,
            {
                passive: true,
            }
        );

        return () => {
            conteneur.removeEventListener(
                "scroll",
                mettreAJour
            );
        };

    }, [jourActif]);


    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (

        <aside
            className="
                w-14
                shrink-0
                border-l
                pl-2
            "
            aria-label="Navigation par heure"
        >

            <div
                className="
                    flex
                    h-full
                    flex-col
                    justify-between
                    py-1
                "
            >

                {HEURES.map((heure) => {

                    const active =
                        heure === heureActive;

                    const afficherHeure =
                        heure % 2 === 0 ||
                        active;

                    return (

                        <button
                            key={heure}
                            type="button"
                            onClick={() =>
                                allerAHeure(
                                    heure
                                )
                            }
                            className="
                                flex
                                items-center
                                justify-end
                                gap-1
                                text-xs
                            "
                            title={`${heure}h`}
                        >

                            <span
                                className={
                                    active
                                        ? "font-semibold"
                                        : "text-gray-500"
                                }
                            >
                                {afficherHeure
                                    ? `${String(
                                        heure
                                    ).padStart(
                                        2,
                                        "0"
                                    )}h`
                                    : ""}
                            </span>

                            <span
                                className={
                                    active
                                        ? "h-px w-4 bg-current"
                                        : "h-px w-2 bg-current opacity-40"
                                }
                            />

                        </button>

                    );
                })}

            </div>

        </aside>

    );
}