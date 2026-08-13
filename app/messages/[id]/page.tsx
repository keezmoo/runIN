import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageForm from "./message-form";
import MarquerMessagesLus
    from "./marquer-messages-lus";
import RealtimeMessages
    from "./realtime-messages";
import ScrollVersDernierMessage
    from "./scroll-vers-dernier-message";
import StatutConversation
    from "./statut-conversation";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};


export default async function ConversationPage({
    params,
}: PageProps) {

    const { id } = await params;

    const supabase = await createClient();


    // ------------------------------------------------
    // UTILISATEUR CONNECTÉ
    // ------------------------------------------------

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }


    // ------------------------------------------------
    // CONVERSATION
    // ------------------------------------------------

    const {
        data: conversation,
        error: conversationError,
    } = await supabase
        .from("conversations_sortie")
        .select(`
            id,
            sortie_id,
            utilisateur_id,
            created_at
        `)
        .eq("id", id)
        .maybeSingle();


    if (
        conversationError ||
        !conversation
    ) {
        notFound();
    }


    // ------------------------------------------------
    // SORTIE
    // ------------------------------------------------

    const {
        data: sortie,
        error: sortieError,
    } = await supabase
        .from("sorties")
        .select(`
            id,
            titre,
            organisateur_id,
            date_heure_depart,
            duree_estimee_minutes,
            statut
        `)
        .eq(
            "id",
            conversation.sortie_id
        )
        .maybeSingle();


    if (
        sortieError ||
        !sortie
    ) {
        notFound();
    }


    // ------------------------------------------------
    // INTERLOCUTEUR
    // ------------------------------------------------

    const interlocuteurId =
        user.id === conversation.utilisateur_id
            ? sortie.organisateur_id
            : conversation.utilisateur_id;


    const {
        data: interlocuteur,
    } = await supabase
        .from("profiles")
        .select(`
            id,
            nom
        `)
        .eq(
            "id",
            interlocuteurId
        )
        .maybeSingle();


    // ------------------------------------------------
    // MESSAGES
    // ------------------------------------------------

    const {
        data: messages,
        error: messagesError,
    } = await supabase
        .from("messages")
        .select(`
            id,
            expediteur_id,
            contenu,
            created_at
        `)
        .eq(
            "conversation_id",
            conversation.id
        )
        .order(
            "created_at",
            {
                ascending: true,
            }
        );


    if (messagesError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Impossible de charger les messages.
                </p>
            </main>
        );
    }

    // ------------------------------------------------
    // ÉTAT DE LA CONVERSATION
    // ------------------------------------------------

    const maintenant =
        new Date();


    const dateDepart =
        new Date(
            sortie.date_heure_depart
        );


    const dureeMinutes =
        sortie.duree_estimee_minutes ?? 0;


    const dateFinEstimee =
        new Date(
            dateDepart.getTime() +
            dureeMinutes * 60 * 1000
        );


    const dateClotureConversation =
        new Date(
            dateFinEstimee.getTime() +
            12 * 60 * 60 * 1000
        );


    const sortieAnnulee =
        sortie.statut === "annulee";


    const conversationExpiree =
        maintenant >
        dateClotureConversation;


    const conversationOuverte =
        !sortieAnnulee &&
        !conversationExpiree;

    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (
        <main className="mx-auto max-w-2xl p-6">

            <MarquerMessagesLus
                conversationId={
                    conversation.id
                }
            />

            <RealtimeMessages
                conversationId={
                    conversation.id
                }
                userId={
                    user.id
                }
            />

            {/* EN-TÊTE */}

            <header className="mb-6 border-b pb-4">

                <Link
                    href={`/sorties/${sortie.id}`}
                    className="text-sm underline"
                >
                    ← Voir la sortie
                </Link>

                <h1 className="mt-3 text-2xl font-bold">
                    {sortie.titre}
                </h1>

                <p className="mt-1 text-gray-500">
                    Conversation avec{" "}
                    <strong>
                        {interlocuteur?.nom ??
                            "Utilisateur"}
                    </strong>
                </p>

            </header>

            <StatutConversation
                statutSortie={sortie.statut}
                dateFinEstimee={
                    dateFinEstimee.toISOString()
                }
                dateCloture={
                    dateClotureConversation.toISOString()
                }
            />

            {/* MESSAGES */}

            <section className="space-y-3">

                {(messages ?? []).length === 0 ? (

                    <p className="text-gray-500">
                        Aucun message pour le moment.
                    </p>

                ) : (

                    (messages ?? []).map(
                        (message) => {

                            const estMoi =
                                message.expediteur_id ===
                                user.id;

                            return (
                                <div
                                    key={message.id}
                                    className={
                                        estMoi
                                            ? "flex justify-end"
                                            : "flex justify-start"
                                    }
                                >
                                    <div className="max-w-[80%] rounded border px-4 py-3">

                                        <p className="text-sm font-semibold">
                                            {estMoi
                                                ? "Vous"
                                                : interlocuteur?.nom ??
                                                "Utilisateur"}
                                        </p>

                                        <p className="mt-1 whitespace-pre-wrap">
                                            {message.contenu}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-500">
                                            {new Date(
                                                message.created_at
                                            ).toLocaleString(
                                                "fr-FR",
                                                {
                                                    dateStyle:
                                                        "short",
                                                    timeStyle:
                                                        "short",
                                                }
                                            )}
                                        </p>

                                    </div>
                                </div>
                            );
                        }
                    )

                )}

                <ScrollVersDernierMessage
                    dernierMessageId={
                        messages && messages.length > 0
                            ? messages[messages.length - 1].id
                            : undefined
                    }
                />

            </section>


            {/* ENVOI D'UN MESSAGE */}

            {conversationOuverte && (
                <section className="mt-6 border-t pt-4">

                    <MessageForm
                        conversationId={
                            conversation.id
                        }
                        userId={user.id}
                    />

                </section>
            )}

        </main>
    );
}