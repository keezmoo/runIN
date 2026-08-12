"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type AnnulerSortieButtonProps = {
    sortieId: string;
    titre: string;
};


export default function AnnulerSortieButton({
    sortieId,
    titre,
}: AnnulerSortieButtonProps) {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");


    async function annulerSortie() {
        const confirmation =
            window.confirm(
                `Annuler la sortie "${titre}" ?`
            );

        if (!confirmation) {
            return;
        }

        setLoading(true);
        setMessage("");

        const { error } = await supabase.rpc(
            "annuler_sortie",
            {
                p_sortie_id: sortieId,
            }
        );

        if (error) {
            setMessage(
                "Impossible d'annuler la sortie."
            );
            setLoading(false);
            return;
        }

        router.refresh();
    }


    return (
        <div>
            <button
                type="button"
                onClick={annulerSortie}
                disabled={loading}
                className="rounded border px-4 py-2 disabled:opacity-40"
            >
                {loading
                    ? "Annulation..."
                    : "Annuler la sortie"}
            </button>

            {message && (
                <p className="mt-2 text-sm">
                    {message}
                </p>
            )}
        </div>
    );
}