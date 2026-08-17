"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    createClient,
} from "@/lib/supabase/client";


export default function NotificationsEmailButton() {

    const [
        actif,
        setActif,
    ] = useState<boolean | null>(
        null
    );


    const [
        userId,
        setUserId,
    ] = useState<string | null>(
        null
    );


    const [
        chargement,
        setChargement,
    ] = useState(false);


    const [
        erreur,
        setErreur,
    ] = useState("");


    // ------------------------------------------------
    // CHARGEMENT DE LA PRÉFÉRENCE
    // ------------------------------------------------

    useEffect(() => {

        async function chargerPreference() {

            const supabase =
                createClient();


            const {
                data: {
                    user,
                },
            } =
                await supabase.auth.getUser();


            if (!user) {
                return;
            }


            setUserId(
                user.id
            );


            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(
                    "notifications_email_activees"
                )
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "Erreur chargement préférence e-mail :",
                    error
                );

                setChargement(false);

                return;

            }


            if (!data) {

                // Le compte Auth existe mais le profil
                // n'a pas encore été créé.

                setChargement(false);

                return;

            }


            setActif(
                data.notifications_email_activees
            );


            setChargement(false);
        }



        chargerPreference();

    }, []);


    // ------------------------------------------------
    // ACTIVATION / DÉSACTIVATION
    // ------------------------------------------------

    async function basculerPreference() {

        if (
            userId === null ||
            actif === null ||
            chargement
        ) {
            return;
        }


        setChargement(true);
        setErreur("");


        const nouvelleValeur =
            !actif;


        const supabase =
            createClient();


        const {
            error,
        } = await supabase
            .from("profiles")
            .update({
                notifications_email_activees:
                    nouvelleValeur,
            })
            .eq(
                "id",
                userId
            );


        if (error) {

            console.error(
                "Erreur modification préférence e-mail :",
                error
            );

            setErreur(
                "Impossible de modifier la préférence."
            );

            setChargement(false);

            return;
        }


        setActif(
            nouvelleValeur
        );

        setChargement(false);
    }


    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    if (actif === null) {

        return (
            <p className="text-sm text-gray-500">
                Chargement...
            </p>
        );
    }


    return (
        <div>

            <p className="text-sm">
                E-mails de notification :{" "}

                <strong>
                    {actif
                        ? "activés"
                        : "désactivés"}
                </strong>
            </p>


            <button
                type="button"
                onClick={
                    basculerPreference
                }
                disabled={
                    chargement
                }
                className="
                    mt-3
                    rounded
                    border
                    px-4
                    py-2
                    text-sm
                    disabled:opacity-50
                "
            >
                {chargement
                    ? "Enregistrement..."
                    : actif
                        ? "Désactiver les e-mails"
                        : "Activer les e-mails"}
            </button>


            {erreur && (

                <p className="mt-2 text-sm">
                    {erreur}
                </p>

            )}

        </div>
    );
}