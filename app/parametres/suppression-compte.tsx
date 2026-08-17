"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";


export default function SuppressionCompte() {

    const [
        confirmation,
        setConfirmation,
    ] = useState("");

    const [
        afficherConfirmation,
        setAfficherConfirmation,
    ] = useState(false);

    const [
        suppressionEnCours,
        setSuppressionEnCours,
    ] = useState(false);

    const [
        erreur,
        setErreur,
    ] = useState("");


    const confirmationCorrecte =
        confirmation === "SUPPRIMER";


    async function supprimerCompte() {

        if (!confirmationCorrecte) {
            return;
        }


        setErreur("");
        setSuppressionEnCours(true);


        try {

            const response = await fetch(
                "/api/compte/supprimer",
                {
                    method: "DELETE",
                }
            );


            const resultat =
                await response.json();


            if (!response.ok) {

                setErreur(
                    resultat.error ??
                    "Impossible de supprimer le compte."
                );

                setSuppressionEnCours(false);

                return;
            }


            // Nettoyage de la session locale dans
            // le navigateur après suppression du compte.

            const supabase =
                createBrowserClient(
                    process.env
                        .NEXT_PUBLIC_SUPABASE_URL!,
                    process.env
                        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
                );


            await supabase.auth.signOut({
                scope: "local",
            });


            window.location.replace(
                "/auth/login?compte=supprime"
            );

        } catch (error) {

            console.error(
                "Erreur suppression compte :",
                error
            );


            setErreur(
                "Une erreur inattendue est survenue."
            );

            setSuppressionEnCours(false);

        }

    }


    if (!afficherConfirmation) {

        return (

            <div className="space-y-3">

                <div>

                    <p className="font-medium text-white">
                        Supprimer mon compte
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                        Cette action supprime définitivement
                        votre compte et les données qui lui
                        sont associées.
                    </p>

                </div>


                <button
                    type="button"
                    onClick={() =>
                        setAfficherConfirmation(true)
                    }
                    className="
                        rounded-lg
                        border
                        border-red-900
                        bg-red-950/40
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-red-400
                        hover:bg-red-950/70
                    "
                >
                    Supprimer mon compte
                </button>

            </div>

        );

    }


    return (

        <div
            className="
                space-y-4
                rounded-lg
                border
                border-red-900
                bg-red-950/20
                p-4
            "
        >

            <div>

                <p className="font-medium text-red-400">
                    Suppression définitive du compte
                </p>

                <p className="mt-2 text-sm text-zinc-300">
                    Cette action est irréversible.
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                    Vos sorties, participations,
                    demandes, conversations, messages
                    et autres données liées au compte
                    seront supprimés.
                </p>

            </div>


            <div>

                <label
                    htmlFor="confirmation-suppression"
                    className="
                        block
                        text-sm
                        text-zinc-300
                    "
                >
                    Pour confirmer, écrivez{" "}
                    <strong className="text-white">
                        SUPPRIMER
                    </strong>
                </label>


                <input
                    id="confirmation-suppression"
                    type="text"
                    autoComplete="off"
                    value={confirmation}
                    onChange={(event) =>
                        setConfirmation(
                            event.target.value
                        )
                    }
                    disabled={suppressionEnCours}
                    className="
                        mt-2
                        w-full
                        rounded-lg
                        border
                        border-zinc-700
                        bg-zinc-950
                        px-3
                        py-2
                        text-white
                        outline-none
                        focus:border-red-500
                        disabled:opacity-50
                    "
                />

            </div>


            {erreur && (

                <p className="text-sm text-red-400">
                    {erreur}
                </p>

            )}


            <div className="flex flex-wrap gap-3">

                <button
                    type="button"
                    onClick={() => {

                        setAfficherConfirmation(false);
                        setConfirmation("");
                        setErreur("");

                    }}
                    disabled={suppressionEnCours}
                    className="
                        rounded-lg
                        border
                        border-zinc-700
                        bg-zinc-800
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-white
                        hover:bg-zinc-700
                        disabled:opacity-50
                    "
                >
                    Annuler
                </button>


                <button
                    type="button"
                    onClick={supprimerCompte}
                    disabled={
                        !confirmationCorrecte ||
                        suppressionEnCours
                    }
                    className="
                        rounded-lg
                        bg-red-700
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-white
                        hover:bg-red-600
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                    "
                >
                    {suppressionEnCours
                        ? "Suppression..."
                        : "Supprimer définitivement"}
                </button>

            </div>

        </div>

    );

}