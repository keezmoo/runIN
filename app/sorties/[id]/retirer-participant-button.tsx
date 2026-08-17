"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RetirerParticipantButtonProps = {
    sortieId: string;
    utilisateurId: string;
    nomParticipant: string;
};

export default function RetirerParticipantButton({
    sortieId,
    utilisateurId,
    nomParticipant,
}: RetirerParticipantButtonProps) {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");


    async function retirerParticipant() {

        const confirmation = window.confirm(
            `Retirer ${nomParticipant} de cette sortie ?`
        );

        if (!confirmation) {
            return;
        }


        setLoading(true);
        setMessage("");


        const { error } = await supabase.rpc(
            "retirer_participant_sortie",
            {
                p_sortie_id: sortieId,
                p_utilisateur_id: utilisateurId,
            }
        );


        if (error) {

            console.error(
                "Erreur retrait participant :",
                error
            );

            setMessage(
                "Impossible de retirer ce participant."
            );

            setLoading(false);

            return;
        }


        setLoading(false);

        router.refresh();
    }


    return (
        <div>

            <button
                type="button"
                onClick={retirerParticipant}
                disabled={loading}
                className="rounded border border-red-500 px-3 py-2 text-red-500 disabled:opacity-40"
            >
                {loading
                    ? "Retrait..."
                    : "Retirer"}
            </button>


            {message && (
                <p className="mt-2 text-sm text-red-500">
                    {message}
                </p>
            )}

        </div>
    );
}