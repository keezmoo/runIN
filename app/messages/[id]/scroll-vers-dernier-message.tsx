"use client";

import {
    useEffect,
    useRef,
} from "react";


type ScrollVersDernierMessageProps = {
    dernierMessageId?: string;
    dernierMessageEstMoi?: boolean;
};


export default function ScrollVersDernierMessage({
    dernierMessageId,
    dernierMessageEstMoi = false,
}: ScrollVersDernierMessageProps) {

    const finMessagesRef =
        useRef<HTMLDivElement>(null);

    const premiereOuverture =
        useRef(true);

    const procheDuBas =
        useRef(true);


    // ------------------------------------------------
    // SURVEILLER LA POSITION DU SCROLL
    // ------------------------------------------------

    useEffect(() => {

        const elementFin =
            finMessagesRef.current;

        if (!elementFin) {
            return;
        }


        const zoneTrouvee =
            elementFin.closest(
                "[data-messages-scroll]"
            );

        if (!zoneTrouvee) {
            return;
        }


        const zoneMessages =
            zoneTrouvee as HTMLElement;


        function verifierPosition() {

            const distanceDuBas =
                zoneMessages.scrollHeight -
                zoneMessages.scrollTop -
                zoneMessages.clientHeight;


            procheDuBas.current =
                distanceDuBas < 150;
        }


        verifierPosition();


        zoneMessages.addEventListener(
            "scroll",
            verifierPosition
        );


        return () => {

            zoneMessages.removeEventListener(
                "scroll",
                verifierPosition
            );

        };

    }, []);


    // ------------------------------------------------
    // NOUVEAU DERNIER MESSAGE
    // ------------------------------------------------

    useEffect(() => {

        const elementFin =
            finMessagesRef.current;

        if (!elementFin) {
            return;
        }


        const zoneTrouvee =
            elementFin.closest(
                "[data-messages-scroll]"
            );

        if (!zoneTrouvee) {
            return;
        }


        const zoneMessages =
            zoneTrouvee as HTMLElement;


        // Première ouverture :
        // aller directement en bas.

        if (premiereOuverture.current) {

            zoneMessages.scrollTo({
                top: zoneMessages.scrollHeight,
                behavior: "auto",
            });

            premiereOuverture.current =
                false;

            procheDuBas.current =
                true;

            return;
        }


        // Message envoyé par moi :
        // toujours descendre en bas.

        if (dernierMessageEstMoi) {

            zoneMessages.scrollTo({
                top: zoneMessages.scrollHeight,
                behavior: "smooth",
            });

            procheDuBas.current =
                true;

            return;
        }


        // Message reçu :
        // descendre seulement si on était
        // déjà proche du bas.

        if (procheDuBas.current) {

            zoneMessages.scrollTo({
                top: zoneMessages.scrollHeight,
                behavior: "smooth",
        });

        }

    }, [
        dernierMessageId,
        dernierMessageEstMoi,
    ]);


    return (
        <div
            ref={finMessagesRef}
            aria-hidden="true"
        />
    );
}