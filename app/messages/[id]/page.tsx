import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageForm from "./message-form";
import MarquerMessagesLus from "./marquer-messages-lus";
import RealtimeMessages from "./realtime-messages";
import ScrollVersDernierMessage from "./scroll-vers-dernier-message";
import StatutConversation from "./statut-conversation";

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
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger la conversation.</p>
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
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger les messages.</p>
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

        <p className="mt-1 text-gray-500">
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
            <p className="text-gray-500">Aucun message pour le moment.</p>
          ) : (
            messages.map((message, index) => {
              const estMoi = message.expediteur_id === user.id;

              const messagePrecedent = index > 0 ? messages[index - 1] : null;

              const memeExpediteurQuePrecedent =
                messagePrecedent?.expediteur_id === message.expediteur_id;

              return (
                <div
                  key={message.id}
                  className={`
                    flex
                    ${estMoi ? "justify-end" : "justify-start"}
                    ${memeExpediteurQuePrecedent ? "mt-1" : "mt-3"}
`}
                >
                  <div
                    className={`
        min-w-0
        max-w-[80%]
        rounded-lg
        border
        px-4
        py-3

        ${estMoi ? "border-[#8ED8B6]/30 bg-[#8ED8B6]/10" : "bg-gray-500/10"}
      `}
                  >
                    <p
                      className="
          whitespace-pre-wrap
          break-words
        "
                    >
                      {message.contenu}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
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
