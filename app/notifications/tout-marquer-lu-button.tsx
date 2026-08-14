"use client";

import {
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";

import {
    createClient,
} from "@/lib/supabase/client";


type ToutMarquerLuButtonProps = {
    nombreNonLues: number;
};


export default function ToutMarquerLuButton({
    nombreNonLues,
}: ToutMarquerLuButtonProps) {

    const router =
        useRouter();


    const [
        chargement,
        setChargement,
    ] = useState(false);


    const [
        erreur,
        setErreur,
    ] = useState("");


    async function toutMarquerCommeLu() {

        if (
            chargement ||
            nombreNonLues === 0
        ) {
            return;
        }


        setChargement(true);
        setErreur("");


        const supabase =
            createClient();


        const {
            error,
        } = await supabase.rpc(
            "marquer_toutes_notifications_lues"
        );


        if (error) {

            console.error(
                "Erreur lecture notifications :",
                error
            );


            setErreur(
                "Impossible de marquer les notifications comme lues."
            );


            setChargement(false);

            return;
        }


        // Actualise le badge de navigation
        window.dispatchEvent(
            new Event(
                "notifications-non-lues-modifiees"
            )
        );


        // Actualise la page Server Component
        router.refresh();


        setChargement(false);
    }


    if (nombreNonLues === 0) {
        return null;
    }


    return (
        <div>

            <button
                type="button"
                onClick={
                    toutMarquerCommeLu
                }
                disabled={
                    chargement
                }
                className="
                    rounded
                    border
                    px-3
                    py-2
                    text-sm
                    disabled:opacity-50
                "
            >
                {chargement
                    ? "Traitement..."
                    : "Tout marquer comme lu"}
            </button>


            {erreur && (

                <p className="mt-2 text-sm">
                    {erreur}
                </p>

            )}

        </div>
    );
}