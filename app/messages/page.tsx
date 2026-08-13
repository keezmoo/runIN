import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";


export default async function MessagesPage() {

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
    // CONVERSATIONS ACCESSIBLES
    // ------------------------------------------------

    const {
        data: conversations,
        error: conversationsError,
    } = await supabase
        .from("conversations_sortie")
        .select(`
            id,
            sortie_id,
            utilisateur_id,
            created_at
        `)
        .order(
            "created_at",
            {
                ascending: false,
            }
        );


    if (conversationsError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Impossible de charger les conversations.
                </p>
            </main>
        );
    }


    if (
        !conversations ||
        conversations.length === 0
    ) {
        return (
            <main className="mx-auto max-w-2xl p-6">

                <h1 className="mb-6 text-3xl font-bold">
                    Messages
                </h1>

                <p className="text-gray-500">
                    Vous n&apos;avez aucune conversation active.
                </p>

            </main>
        );
    }


    // ------------------------------------------------
    // SORTIES ASSOCIÉES
    // ------------------------------------------------

    const idsSorties = [
        ...new Set(
            conversations.map(
                (conversation) =>
                    conversation.sortie_id
            )
        ),
    ];


    const {
        data: sorties,
        error: sortiesError,
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
        .in(
            "id",
            idsSorties
        );


    if (sortiesError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Impossible de charger les sorties.
                </p>
            </main>
        );
    }


    // ------------------------------------------------
    // CONVERSATIONS ENCORE ACTIVES
    // ------------------------------------------------

    const maintenant =
        Date.now();


    const conversationsActives =
        conversations.filter(
            (conversation) => {

                const sortie =
                    (sorties ?? []).find(
                        (sortie) =>
                            sortie.id ===
                            conversation.sortie_id
                    );


                if (!sortie) {
                    return false;
                }


                // Une sortie annulée
                // ferme immédiatement la conversation
                if (
                    sortie.statut !==
                    "planifiee"
                ) {
                    return false;
                }


                const dateDepart =
                    new Date(
                        sortie.date_heure_depart
                    ).getTime();


                const dureeMinutes =
                    sortie.duree_estimee_minutes ??
                    0;


                const dateFinEstimee =
                    dateDepart +
                    dureeMinutes *
                    60 *
                    1000;


                const dateCloture =
                    dateFinEstimee +
                    12 *
                    60 *
                    60 *
                    1000;


                return (
                    maintenant <=
                    dateCloture
                );
            }
        );


    if (
        conversationsActives.length === 0
    ) {
        return (
            <main className="mx-auto max-w-2xl p-6">

                <h1 className="mb-6 text-3xl font-bold">
                    Messages
                </h1>

                <p className="text-gray-500">
                    Vous n&apos;avez aucune conversation active.
                </p>

            </main>
        );
    }


    // ------------------------------------------------
    // INTERLOCUTEURS
    // ------------------------------------------------

    const idsInterlocuteurs =
        conversationsActives.map(
            (conversation) => {

                const sortie =
                    (sorties ?? []).find(
                        (sortie) =>
                            sortie.id ===
                            conversation.sortie_id
                    );


                if (!sortie) {
                    return "";
                }


                return (
                    conversation.utilisateur_id ===
                        user.id
                        ? sortie.organisateur_id
                        : conversation.utilisateur_id
                );
            }
        );


    const idsInterlocuteursUniques = [
        ...new Set(
            idsInterlocuteurs.filter(
                Boolean
            )
        ),
    ];


    const {
        data: profils,
        error: profilsError,
    } = await supabase
        .from("profiles")
        .select(`
            id,
            nom
        `)
        .in(
            "id",
            idsInterlocuteursUniques
        );


    if (profilsError) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <p>
                    Impossible de charger les interlocuteurs.
                </p>
            </main>
        );
    }


    // ------------------------------------------------
    // DERNIERS MESSAGES
    // ------------------------------------------------

    const idsConversations =
        conversationsActives.map(
            (conversation) =>
                conversation.id
        );


    const {
        data: messages,
        error: messagesError,
    } = await supabase
        .from("messages")
        .select(`
        id,
        conversation_id,
        expediteur_id,
        contenu,
        created_at,
        lu_at
    `)
        .in(
            "conversation_id",
            idsConversations
        )
        .order(
            "created_at",
            {
                ascending: false,
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
    // PRÉPARATION DE L'AFFICHAGE
    // ------------------------------------------------

    const conversationsAffichees =
        conversationsActives
            .map(
                (conversation) => {

                    const sortie =
                        (sorties ?? []).find(
                            (sortie) =>
                                sortie.id ===
                                conversation.sortie_id
                        );


                    if (!sortie) {
                        return null;
                    }


                    const interlocuteurId =
                        conversation.utilisateur_id ===
                            user.id
                            ? sortie.organisateur_id
                            : conversation.utilisateur_id;


                    const interlocuteur =
                        (profils ?? []).find(
                            (profil) =>
                                profil.id ===
                                interlocuteurId
                        );


                    // Les messages sont déjà triés
                    // du plus récent au plus ancien
                    const dernierMessage =
                        (messages ?? []).find(
                            (message) =>
                                message.conversation_id ===
                                conversation.id
                        );

                    const nombreNonLus =
                        (messages ?? []).filter(
                            (message) =>
                                message.conversation_id ===
                                conversation.id &&

                                message.expediteur_id !==
                                user.id &&

                                message.lu_at === null
                        ).length;

                    return {
                        conversation,
                        sortie,
                        interlocuteur,
                        dernierMessage,
                        nombreNonLus,
                    };
                }
            )
            .filter(
                (
                    element
                ): element is NonNullable<
                    typeof element
                > => element !== null
            )
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.dernierMessage
                                ?.created_at ??
                            a.conversation
                                .created_at
                        ).getTime();


                    const dateB =
                        new Date(
                            b.dernierMessage
                                ?.created_at ??
                            b.conversation
                                .created_at
                        ).getTime();


                    return dateB - dateA;
                }
            );


    // ------------------------------------------------
    // AFFICHAGE
    // ------------------------------------------------

    return (
        <main className="mx-auto max-w-2xl p-6">

            <h1 className="mb-6 text-3xl font-bold">
                Messages
            </h1>


            <div className="space-y-3">

                {conversationsAffichees.map(
                    ({
                        conversation,
                        sortie,
                        interlocuteur,
                        dernierMessage,
                        nombreNonLus,
                    }) => {

                        const texteDernierMessage =
                            dernierMessage
                                ?.contenu ??
                            "Aucun message pour le moment.";


                        const apercu =
                            texteDernierMessage.length >
                                100
                                ? `${texteDernierMessage.slice(
                                    0,
                                    100
                                )}…`
                                : texteDernierMessage;


                        const dateActivite =
                            dernierMessage
                                ?.created_at ??
                            conversation.created_at;


                        return (
                            <Link
                                key={
                                    conversation.id
                                }
                                href={`/messages/${conversation.id}`}
                                className="block rounded border p-4 hover:bg-gray-500/10"
                            >

                                <div className="flex items-start justify-between gap-4">

                                    <div className="min-w-0">

                                        <h2 className="font-semibold">
                                            {
                                                interlocuteur?.nom ??
                                                "Utilisateur"
                                            }
                                        </h2>

                                        {nombreNonLus > 0 && (
                                            <span className="mt-1 inline-block rounded-full bg-[#8ED8B6] px-2 py-0.5 text-xs font-semibold text-black">
                                                {nombreNonLus === 1
                                                    ? "1 nouveau message"
                                                    : `${nombreNonLus} nouveaux messages`}
                                            </span>
                                        )}

                                        <p className="mt-1 text-sm font-medium">
                                            {sortie.titre}
                                        </p>


                                        <p className="mt-2 truncate text-sm text-gray-500">
                                            {apercu}
                                        </p>

                                    </div>


                                    <p className="shrink-0 text-xs text-gray-500">
                                        {new Date(
                                            dateActivite
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

                            </Link>
                        );
                    }
                )}

            </div>

        </main>
    );
}