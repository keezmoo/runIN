"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";


type MarquerMessagesLusProps = {
    conversationId: string;
};


export default function MarquerMessagesLus({
    conversationId,
}: MarquerMessagesLusProps) {

    useEffect(() => {

        let composantActif = true;


        async function marquerCommeLus() {

            const supabase =
                createClient();


            const { error } =
                await supabase.rpc(
                    "marquer_messages_comme_lus",
                    {
                        p_conversation_id:
                            conversationId,
                    }
                );


            if (!composantActif) {
                return;
            }


            if (error) {
                console.error(
                    "Erreur lecture messages :",
                    error
                );

                return;
            }


            // Informe notamment la navigation
            // que le compteur doit être recalculé
            window.dispatchEvent(
                new Event(
                    "messages-non-lus-modifies"
                )
            );
        }


        marquerCommeLus();


        return () => {
            composantActif = false;
        };

    }, [conversationId]);


    return null;
}