import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageForm from "./message-form";
import MarquerMessagesLus from "./marquer-messages-lus";
import RealtimeMessages from "./realtime-messages";
import ScrollVersDernierMessage from "./scroll-vers-dernier-message";
import StatutConversation from "./statut-conversation";
import SignalerButton from "@/components/signaler-button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConversationPage({ params }: PageProps) {
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

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations_sortie")
    .select(
      `
            id,
            sortie_id,
            utilisateur_id,
            created_at
        `,
    )
    .eq("id", id)
    .maybeSingle();

  if (conversationError || !conversation) {
    notFound();
  }

  // ------------------------------------------------
  // SORTIE
  // ------------------------------------------------

  const { data: sortie, error: sortieError } = await supabase
    .from("sorties")
    .select(
      `
            id,
            titre,
            organisateur_id,
            date_heure_depart,
            duree_estimee_minutes,
            statut
        `,
    )
    .eq("id", conversation.sortie_id)
    .maybeSingle();

  if (sortieError || !sortie) {
    notFound();
  }

  // ------------------------------------------------
  // INTERLOCUTEUR
  // ------------------------------------------------

  const interlocuteurId =
    user.id === conversation.utilisateur_id
      ? sortie.organisateur_id
      : conversation.utilisateur_id;

  // ------------------------------------------------
  // BLOCAGE
  // ------------------------------------------------

  const { data: relationBloquee, error: relationBloqueeError } =
    await supabase.rpc("est_relation_bloquee", {
      p_autre_utilisateur_id: interlocuteurId,
    });

  if (relationBloqueeError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-4 md:p-6">
        <p className="text-sm text-destructive">
          Impossible de charger la conversation.
        </p>
      </main>
    );
  }

  if (relationBloquee) {
    notFound();
  }

  const [interlocuteurResult, messagesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nom")
      .eq("id", interlocuteurId)
      .maybeSingle(),

    supabase
      .from("messages")
      .select(
        `
          id,
          expediteur_id,
          contenu,
          created_at
        `,
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (interlocuteurResult.error || messagesResult.error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-4 md:p-6">
        <p className="text-sm text-destructive">
          Impossible de charger les messages.
        </p>
      </main>
    );
  }

  const interlocuteur = interlocuteurResult.data;
  const messages = messagesResult.data ?? [];

  // ------------------------------------------------
  // ÉTAT DE LA CONVERSATION
  // ------------------------------------------------

  const maintenant = new Date();

  const dateDepart = new Date(sortie.date_heure_depart);

  const dureeMinutes = sortie.duree_estimee_minutes ?? 0;

  const dateFinEstimee = new Date(
    dateDepart.getTime() + dureeMinutes * 60 * 1000,
  );

  const dateClotureConversation = new Date(
    dateFinEstimee.getTime() + 12 * 60 * 60 * 1000,
  );

  const sortieAnnulee = sortie.statut === "annulee";

  const conversationExpiree = maintenant > dateClotureConversation;

  const conversationOuverte = !sortieAnnulee && !conversationExpiree;

  const DELAI_GROUPE_MS = 5 * 60 * 1000;

  const groupesMessages = messages.reduce<
    Array<{
      expediteurId: string;
      messages: typeof messages;
    }>
  >((groupes, message) => {
    const dernierGroupe = groupes[groupes.length - 1];
    const dernierMessage =
      dernierGroupe?.messages[dernierGroupe.messages.length - 1];

    const memeExpediteur =
      dernierGroupe?.expediteurId === message.expediteur_id;

    const assezProche =
      dernierMessage &&
      new Date(message.created_at).getTime() -
        new Date(dernierMessage.created_at).getTime() <=
        DELAI_GROUPE_MS;

    if (dernierGroupe && memeExpediteur && assezProche) {
      dernierGroupe.messages.push(message);
    } else {
      groupes.push({
        expediteurId: message.expediteur_id,
        messages: [message],
      });
    }

    return groupes;
  }, []);

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main
      className="
            mx-auto
            flex
            h-[calc(100dvh-8rem)]
            max-w-2xl
            flex-col
            overflow-hidden
            p-4
            md:h-[calc(100dvh-5rem)]
            md:p-6
        "
    >
      <MarquerMessagesLus conversationId={conversation.id} />

      <RealtimeMessages conversationId={conversation.id} userId={user.id} />

      {/* ------------------------------------------------ */}
      {/* EN-TÊTE */}
      {/* ------------------------------------------------ */}

      <header className="shrink-0 border-b pb-4">
        <Link href="/messages" className="text-sm underline">
          ← Messages
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          <Link href={`/sorties/${sortie.id}`} className="hover:underline">
            {sortie.titre}
          </Link>
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Conversation avec{" "}
          <Link
            href={`/membres/${interlocuteurId}`}
            className="font-semibold hover:underline"
          >
            {interlocuteur?.nom ?? "Utilisateur"}
          </Link>
        </p>
      </header>

      {/* ------------------------------------------------ */}
      {/* STATUT */}
      {/* ------------------------------------------------ */}

      <div className="shrink-0 py-3">
        <StatutConversation
          statutSortie={sortie.statut}
          dateFinEstimee={dateFinEstimee.toISOString()}
          dateCloture={dateClotureConversation.toISOString()}
        />
      </div>

      {/* ------------------------------------------------ */}
      {/* ZONE SCROLLABLE DES MESSAGES */}
      {/* ------------------------------------------------ */}

      <section
        data-messages-scroll
        className="
                min-h-0
                flex-1
                overflow-y-auto
                pr-1
            "
      >
        <div className="pb-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun message pour le moment.
            </p>
          ) : (
            groupesMessages.map((groupe) => {
              const estMoi = groupe.expediteurId === user.id;

              return (
                <div
                  key={groupe.messages[0].id}
                  className={`
        mt-3
        flex
        ${estMoi ? "justify-end" : "justify-start"}
      `}
                >
                  <div
                    className={`
          inline-flex
          max-w-[80%]
          flex-col
          overflow-hidden
          rounded-xl
          border

          ${
            estMoi
              ? "border-primary-strong/30 bg-primary/10"
              : "border-border bg-muted"
          }
        `}
                  >
                    {groupe.messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`
              px-4
              py-3
              ${index > 0 ? "border-t border-border/60" : ""}
            `}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.contenu}
                        </p>

                        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(message.created_at).toLocaleString(
                              "fr-FR",
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              },
                            )}
                          </span>

                          {!estMoi && (
                            <SignalerButton
                              typeCible="message"
                              cibleId={message.id}
                              libelle="⋯"
                              affichage="modal"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <ScrollVersDernierMessage
            dernierMessageId={
              messages.length > 0 ? messages[messages.length - 1].id : undefined
            }
            dernierMessageEstMoi={
              messages.length > 0
                ? messages[messages.length - 1].expediteur_id === user.id
                : false
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* ZONE D'ÉCRITURE */}
      {/* ------------------------------------------------ */}

      {conversationOuverte && (
        <section
          className="
                    shrink-0
                    border-t
                    pt-4
                "
        >
          <MessageForm conversationId={conversation.id} />
        </section>
      )}
    </main>
  );
}
