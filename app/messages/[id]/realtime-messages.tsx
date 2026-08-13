"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type RealtimeMessagesProps = {
    conversationId: string;
    userId: string;
};


export default function RealtimeMessages({
    conversationId,
    userId,
}: RealtimeMessagesProps) {

    const router = useRouter();


    useEffect(() => {

        const supabase =
            createClient();


        const channel = supabase
            .channel(
                `messages-${conversationId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {

                    const nouveauMessage =
                        payload.new as {
                            expediteur_id?: string;
                        };


                    // Si le message vient de
                    // l'autre utilisateur et que
                    // le chat est actuellement ouvert,
                    // on le marque immédiatement comme lu.
                    if (
                        nouveauMessage
                            .expediteur_id !==
                        userId
                    ) {

                        const {
                            error,
                        } = await supabase.rpc(
                            "marquer_messages_comme_lus",
                            {
                                p_conversation_id:
                                    conversationId,
                            }
                        );


                        if (error) {
                            console.error(
                                "Erreur marquage message lu :",
                                error
                            );
                        }


                        // Actualise également le
                        // compteur de la navigation
                        window.dispatchEvent(
                            new Event(
                                "messages-non-lus-modifies"
                            )
                        );
                    }


                    // Recharge les données du
                    // Server Component
                    router.refresh();
                }
            )
            .subscribe();


        return () => {

            supabase.removeChannel(
                channel
            );
        };

    }, [
        conversationId,
        userId,
        router,
    ]);


    return null;
}