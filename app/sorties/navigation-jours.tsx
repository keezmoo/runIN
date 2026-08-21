"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";


type Jour = {
    date: string;
    disponible: boolean;
};


type NavigationJoursProps = {
    jours: Jour[];
    dateInitiale: string;
};


function convertirDate(
    date: string
) {
    // Midi évite les problèmes de changement
    // de jour liés aux fuseaux horaires.
    return new Date(
        `${date}T12:00:00`
    );
}


function capitaliser(
    texte: string
) {
    return (
        texte.charAt(0).toUpperCase() +
        texte.slice(1)
    );
}


export default function NavigationJours({
    jours,
    dateInitiale,
}: NavigationJoursProps) {

    const [
        dateActive,
        setDateActive,
    ] = useState(
        dateInitiale
    );

    const dateActiveRef =
        useRef(dateInitiale);

    function changerJourActif(
        nouvelleDate: string
    ) {

        if (
            dateActiveRef.current ===
            nouvelleDate
        ) {
            return;
        }

        dateActiveRef.current =
            nouvelleDate;

        setDateActive(
            nouvelleDate
        );

        window.dispatchEvent(
            new CustomEvent(
                "runin:jour-actif",
                {
                    detail: {
                        date:
                            nouvelleDate,
                    },
                }
            )
        );
    }

    const inputDateRef =
        useRef<HTMLInputElement>(
            null
        );
    const aujourdHui =
        new Date()
            .toLocaleDateString(
                "sv-SE"
            );

    // ------------------------------------------------
    // JOUR ACTIF SELON LE SCROLL
    // ------------------------------------------------

    useEffect(() => {

        const conteneur =
            document.getElementById(
                "liste-sorties-scroll"
            );

        if (!conteneur) {
            return;
        }


        function mettreAJourJourActif() {

            const lignes =
                Array.from(
                    conteneur!.querySelectorAll<HTMLElement>(
                        "[data-minute-depart]"
                    )
                );

            const conteneurRect =
                conteneur!.getBoundingClientRect();


            // Première ligne encore visible dans la liste
            const premiereLigneVisible =
                lignes.find(
                    (ligne) =>
                        ligne
                            .getBoundingClientRect()
                            .bottom >
                        conteneurRect.top + 2
                );

            if (!premiereLigneVisible) {
                return;
            }


            const section =
                premiereLigneVisible.closest<HTMLElement>(
                    "[data-jour-sorties]"
                );

            const nouvelleDate =
                section?.dataset.jourSorties;

            if (!nouvelleDate) {
                return;
            }


            changerJourActif(
                nouvelleDate
            );
        }


        mettreAJourJourActif();


        conteneur.addEventListener(
            "scroll",
            mettreAJourJourActif,
            {
                passive: true,
            }
        );


        return () => {

            conteneur.removeEventListener(
                "scroll",
                mettreAJourJourActif
            );

        };

    }, []);

    // ------------------------------------------------
    // MOIS DU JOUR SÉLECTIONNÉ
    // ------------------------------------------------

    const moisAffiche =
        useMemo(() => {

            if (!dateActive) {
                return "";
            }

            return capitaliser(
                convertirDate(
                    dateActive
                ).toLocaleDateString(
                    "fr-FR",
                    {
                        month: "long",
                        year: "numeric",
                    }
                )
            );

        }, [dateActive]);


    // ------------------------------------------------
    // ALLER À UN JOUR
    // ------------------------------------------------

    function allerAuJour(
        date: string
    ) {

        changerJourActif(date);

        const conteneur =
            document.getElementById(
                "liste-sorties-scroll"
            );

        if (!conteneur) {
            return;
        }


        // Jour exact s'il existe.

        let section =
            document.getElementById(
                `jour-${date}`
            );


        // Sinon première journée
        // contenant une sortie après cette date.

        if (!section) {

            const sections =
                Array.from(
                    conteneur.querySelectorAll<HTMLElement>(
                        "[data-jour-sorties]"
                    )
                );

            section =
                sections.find(
                    (element) =>
                        (
                            element.dataset
                                .jourSorties ??
                            ""
                        ) >= date
                ) ?? null;

        }


        if (!section) {
            return;
        }


        const conteneurRect =
            conteneur.getBoundingClientRect();

        const sectionRect =
            section.getBoundingClientRect();


        conteneur.scrollTo({
            top:
                conteneur.scrollTop +
                sectionRect.top -
                conteneurRect.top,
            behavior: "smooth",
        });
    }


    // ------------------------------------------------
    // AUTRE DATE
    // ------------------------------------------------

    function ouvrirCalendrier() {

        const input =
            inputDateRef.current;

        if (!input) {
            return;
        }

        if (input.showPicker) {
            input.showPicker();
        } else {
            input.click();
        }
    }


    function choisirAutreDate(
        date: string
    ) {

        if (
            !date ||
            date < aujourdHui
        ) {
            return;
        }

        const url =
            new URL(
                window.location.href
            );

        url.searchParams.set(
            "date",
            date
        );

        window.location.assign(
            url.toString()
        );
    }


    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (

        <section className="mb-4 shrink-0">

            {/* MOIS + AUTRE DATE */}

            <div
                className="
                    mb-2
                    flex
                    items-center
                    justify-between
                "
            >

                <p className="text-sm font-medium">
                    {moisAffiche}
                </p>


                <div className="relative">

                    <button
                        type="button"
                        onClick={
                            ouvrirCalendrier
                        }
                        className="
                            text-sm
                            text-gray-500
                            hover:underline
                        "
                    >
                        Autre date
                    </button>

                    <input
                        ref={inputDateRef}
                        type="date"
                        min={aujourdHui}
                        className="
                            pointer-events-none
                            absolute
                            h-0
                            w-0
                            opacity-0
                        "
                        onChange={(event) =>
                            choisirAutreDate(
                                event.target.value
                            )
                        }
                    />

                </div>

            </div>


            {/* JOURS */}

            <div
                className="
                    grid
                    grid-cols-7
                    border-b
                "
            >

                {jours.slice(
                    0,
                    7
                ).map((jour) => {

                    const actif =
                        jour.date ===
                        dateActive;

                    const date =
                        convertirDate(
                            jour.date
                        );

                    const nomJour =
                        date.toLocaleDateString(
                            "fr-FR",
                            {
                                weekday: "short",
                            }
                        );

                    const numero =
                        date.getDate();


                    return (

                        <button
                            key={jour.date}
                            type="button"
                            onClick={() =>
                                allerAuJour(
                                    jour.date
                                )
                            }
                            className={`
                                relative
                                flex
                                flex-col
                                items-center
                                py-2
                                text-sm
                                border-b-2

                                ${actif
                                    ? "border-current font-semibold"
                                    : "border-transparent"
                                }
                            `}
                        >

                            <span
                                className="
                                    text-xs
                                    text-gray-500
                                "
                            >
                                {nomJour}
                            </span>

                            <span className="mt-1">
                                {numero}
                            </span>


                            {/* JOUR AVEC SORTIE */}

                            {jour.disponible && (

                                <span
                                    className="
                                        absolute
                                        bottom-0.5
                                        h-1
                                        w-1
                                        rounded-full
                                        bg-current
                                        opacity-50
                                    "
                                />

                            )}

                        </button>

                    );

                })}

            </div>

        </section>

    );
}