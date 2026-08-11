"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type SupprimerSortieButtonProps = {
    sortieId: string;
    titre: string;
};

export default function SupprimerSortieButton({
    sortieId,
    titre,
}: SupprimerSortieButtonProps) {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function supprimerSortie() {
        const confirmation = window.confirm(
            `Supprimer définitivement la sortie "${titre}" ?`
        );

        if (!confirmation) {
            return;
        }

        setLoading(true);
        setMessage("");

        const { error } = await supabase
            .from("sorties")
            .delete()
            .eq("id", sortieId);

        if (error) {
            setMessage(
                "Impossible de supprimer la sortie."
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
                onClick={supprimerSortie}
                disabled={loading}
                className="rounded border px-4 py-2 disabled:opacity-40"
            >
                {loading
                    ? "Suppression..."
                    : "Supprimer"}
            </button>

            {message && (
                <p className="mt-2 text-sm">
                    {message}
                </p>
            )}
        </div>
    );
}