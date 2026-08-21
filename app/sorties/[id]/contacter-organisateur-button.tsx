"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type ContacterOrganisateurButtonProps = {
    sortieId: string;
};


export default function ContacterOrganisateurButton({
    sortieId,
}: ContacterOrganisateurButtonProps) {

    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");


    async function contacterOrganisateur() {

        setLoading(true);
        setMessage("");

        const {
            data: conversationId,
            error,
        } = await supabase.rpc(
            "ouvrir_conversation_sortie",
            {
                p_sortie_id: sortieId,
            }
        );


        if (error || !conversationId) {

            console.error(
                "Erreur ouverture conversation :",
                error
            );

            setMessage(
                "Impossible d'ouvrir la conversation."
            );

            setLoading(false);
            return;
        }


        router.push(
            `/messages/${conversationId}`
        );
    }


    return (
        <div>
            <button
                type="button"
                onClick={
                    contacterOrganisateur
                }
                disabled={loading}
                className="
  rounded
  border
  border-white/50
  bg-black
  px-3
  py-2
  text-sm
  text-white
  disabled:opacity-40
"
            >
                {loading
                    ? "Ouverture..."
                    : "Contacter l'organisateur"}
            </button>

            {message && (
                <p className="mt-2 text-sm">
                    {message}
                </p>
            )}
        </div>
    );
}