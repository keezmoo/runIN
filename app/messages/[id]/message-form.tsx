"use client";

import {
    FormEvent,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type MessageFormProps = {
    conversationId: string;
};


export default function MessageForm({
    conversationId,
}: MessageFormProps) {

    const supabase = createClient();
    const router = useRouter();

    const [contenu, setContenu] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [messageErreur, setMessageErreur] =
        useState("");


    async function envoyerMessage(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const contenuNettoye =
            contenu.trim();


        if (!contenuNettoye) {
            return;
        }


        if (contenuNettoye.length > 2000) {
            setMessageErreur(
                "Le message ne peut pas dépasser 2000 caractères."
            );

            return;
        }


        setLoading(true);
        setMessageErreur("");


        const {
            data,
            error,
        } = await supabase.rpc(
            "envoyer_message_sortie",
            {
                p_conversation_id:
                    conversationId,

                p_contenu:
                    contenuNettoye,
            }
        );

        if (data === "SPAM_MESSAGES") {

            setMessageErreur(
                "Vous envoyez des messages trop rapidement. Réessayez dans une minute."
            );

            setLoading(false);

            return;
        }

        if (error) {

            console.error(
                "Erreur envoi message :",
                error
            );

            setMessageErreur(
                "Impossible d'envoyer le message."
            );

            setLoading(false);

            return;
        }


        setContenu("");
        setLoading(false);

        router.refresh();
    }


    return (
        <form
            onSubmit={envoyerMessage}
            className="space-y-3"
        >

            <textarea
                value={contenu}
                onChange={(event) =>
                    setContenu(
                        event.target.value
                    )
                }
                maxLength={2000}
                rows={3}
                placeholder="Écrire un message..."
                disabled={loading}
                className="w-full rounded border p-3"
            />


            <div className="flex items-center justify-between gap-4">

                <p className="text-xs text-gray-500">
                    {contenu.length} / 2000
                </p>


                <button
                    type="submit"
                    disabled={
                        loading ||
                        contenu.trim() === ""
                    }
                    className="rounded border px-4 py-2 disabled:opacity-50"
                >
                    {loading
                        ? "Envoi..."
                        : "Envoyer"}
                </button>

            </div>


            {messageErreur && (
                <p className="text-sm">
                    {messageErreur}
                </p>
            )}

        </form>
    );
}