"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


export default function SessionsParametres() {

    const router = useRouter();

    const [
        chargementAutres,
        setChargementAutres,
    ] = useState(false);

    const [
        chargementToutes,
        setChargementToutes,
    ] = useState(false);

    const [
        message,
        setMessage,
    ] = useState("");

    const [
        erreur,
        setErreur,
    ] = useState("");


    async function deconnecterAutresSessions() {

        setErreur("");
        setMessage("");
        setChargementAutres(true);


        const supabase =
            createClient();


        const {
            error,
        } =
            await supabase.auth.signOut({
                scope: "others",
            });


        if (error) {

            console.error(
                "Erreur déconnexion autres sessions :",
                error
            );

            setErreur(
                "Impossible de déconnecter les autres appareils."
            );

            setChargementAutres(false);

            return;
        }


        setMessage(
            "Les autres sessions ont été déconnectées."
        );

        setChargementAutres(false);

    }


    async function deconnecterToutesSessions() {

        setErreur("");
        setMessage("");
        setChargementToutes(true);


        const supabase =
            createClient();


        const {
            error,
        } =
            await supabase.auth.signOut({
                scope: "global",
            });


        if (error) {

            console.error(
                "Erreur déconnexion globale :",
                error
            );

            setErreur(
                "Impossible de déconnecter les sessions."
            );

            setChargementToutes(false);

            return;
        }


        router.replace("/auth/login");
        router.refresh();

    }


    return (

        <div className="space-y-5">

            <div>

                <p className="font-medium text-white">
                    Sessions connectées
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                    Gérez les connexions de votre compte
                    sur vos autres appareils et navigateurs.
                </p>

            </div>


            {message && (

                <p className="text-sm text-[#8ED8B6]">
                    {message}
                </p>

            )}


            {erreur && (

                <p className="text-sm text-red-400">
                    {erreur}
                </p>

            )}


            <div className="space-y-3">

                <button
                    type="button"
                    onClick={
                        deconnecterAutresSessions
                    }
                    disabled={
                        chargementAutres ||
                        chargementToutes
                    }
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
                    {chargementAutres
                        ? "Déconnexion..."
                        : "Déconnecter les autres appareils"}
                </button>


                <div>

                    <button
                        type="button"
                        onClick={
                            deconnecterToutesSessions
                        }
                        disabled={
                            chargementAutres ||
                            chargementToutes
                        }
                        className="
                            rounded-lg
                            border
                            border-red-900
                            bg-red-950/30
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-red-400
                            hover:bg-red-950/60
                            disabled:opacity-50
                        "
                    >
                        {chargementToutes
                            ? "Déconnexion..."
                            : "Déconnecter tous les appareils"}
                    </button>

                </div>

            </div>

        </div>

    );

}