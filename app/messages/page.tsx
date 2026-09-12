import Link from "next/link";
import { redirect } from "next/navigation";
import ToutMarquerLuButton from "./tout-marquer-lu-button";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import AvatarUtilisateur from "@/components/avatar-utilisateur";

function numeroJourParis(date: Date) {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const annee = Number(parties.find((partie) => partie.type === "year")?.value);

  const mois = Number(parties.find((partie) => partie.type === "month")?.value);

  const jour = Number(parties.find((partie) => partie.type === "day")?.value);

  return Date.UTC(annee, mois - 1, jour) / 86_400_000;
}

function afficherDateRelative(dateIso: string) {
  const date = new Date(dateIso);
  const maintenant = new Date();

  const difference = maintenant.getTime() - date.getTime();

  if (difference >= 0 && difference < 60_000) {
    return "À l'instant";
  }

  if (difference >= 0 && difference < 3_600_000) {
    const minutes = Math.max(1, Math.floor(difference / 60_000));

    return `Il y a ${minutes} min`;
  }

  if (difference >= 0 && difference < 24 * 3_600_000) {
    const heures = Math.max(1, Math.floor(difference / 3_600_000));

    return `Il y a ${heures} h`;
  }

  const differenceJours = numeroJourParis(maintenant) - numeroJourParis(date);

  if (differenceJours === 1) {
    const heure = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return `Hier à ${heure}`;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

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
  // DONNÉES INITIALES
  // ------------------------------------------------

  const [utilisateursIndisponiblesResult, conversationsResult] =
    await Promise.all([
      supabase.rpc("mes_utilisateurs_indisponibles"),

      supabase
        .from("conversations_sortie")
        .select(
          `
          id,
          sortie_id,
          utilisateur_id,
          created_at
        `,
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

  if (utilisateursIndisponiblesResult.error || conversationsResult.error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-4 md:p-6">
        <p className="text-sm text-destructive">
          Impossible de charger les conversations.
        </p>
      </main>
    );
  }

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesResult.data ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  const conversations = conversationsResult.data ?? [];

  if (conversations.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="hidden text-3xl font-bold md:mb-6 md:block">Messages</h1>

        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez aucune conversation active.
        </p>
      </main>
    );
  }

  // ------------------------------------------------
  // SORTIES ASSOCIÉES
  // ------------------------------------------------

  const idsSorties = [
    ...new Set(conversations.map((conversation) => conversation.sortie_id)),
  ];

  const { data: sorties, error: sortiesError } = await supabase
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
    .in("id", idsSorties);

  if (sortiesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-destructive">
          Impossible de charger les sorties.
        </p>
      </main>
    );
  }

  const sortiesParId = new Map(
    (sorties ?? []).map((sortie) => [sortie.id, sortie]),
  );

  // ------------------------------------------------
  // CONVERSATIONS ENCORE ACTIVES
  // ------------------------------------------------

  // Heure serveur volontairement évaluée pour cette requête.
  const maintenant = Date.now(); // eslint-disable-line react-hooks/purity

  const conversationsActives = conversations.filter((conversation) => {
    const sortie = sortiesParId.get(conversation.sortie_id);

    if (!sortie) {
      return false;
    }

    const interlocuteurId =
      conversation.utilisateur_id === user.id
        ? sortie.organisateur_id
        : conversation.utilisateur_id;

    if (idsIndisponibles.has(interlocuteurId)) {
      return false;
    }

    // Une sortie annulée
    // ferme immédiatement la conversation
    if (sortie.statut !== "planifiee") {
      return false;
    }

    const dateDepart = new Date(sortie.date_heure_depart).getTime();

    const dureeMinutes = sortie.duree_estimee_minutes ?? 0;

    const dateFinEstimee = dateDepart + dureeMinutes * 60 * 1000;

    const dateCloture = dateFinEstimee + 12 * 60 * 60 * 1000;

    return maintenant <= dateCloture;
  });

  if (conversationsActives.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="hidden text-3xl font-bold md:mb-6 md:block">Messages</h1>

        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez aucune conversation active.
        </p>
      </main>
    );
  }

  // ------------------------------------------------
  // INTERLOCUTEURS
  // ------------------------------------------------

  const idsInterlocuteurs = conversationsActives.map((conversation) => {
    const sortie = sortiesParId.get(conversation.sortie_id);

    if (!sortie) {
      return "";
    }

    return conversation.utilisateur_id === user.id
      ? sortie.organisateur_id
      : conversation.utilisateur_id;
  });

  const idsInterlocuteursUniques = [
    ...new Set(idsInterlocuteurs.filter(Boolean)),
  ];

  const idsConversations = conversationsActives.map(
    (conversation) => conversation.id,
  );

  const [profilsResult, messagesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nom")
      .in("id", idsInterlocuteursUniques),

    supabase
      .from("messages")
      .select(
        `
          id,
          conversation_id,
          expediteur_id,
          contenu,
          created_at,
          lu_at
        `,
      )
      .in("conversation_id", idsConversations)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (profilsResult.error || messagesResult.error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-destructive">
          Impossible de charger les conversations.
        </p>
      </main>
    );
  }

  const profils = profilsResult.data ?? [];
  const messages = messagesResult.data ?? [];

  const profilsParId = new Map(profils.map((profil) => [profil.id, profil]));

  // ------------------------------------------------
  // PRÉPARATION DE L'AFFICHAGE
  // ------------------------------------------------

  const dernierMessageParConversation = new Map<
    string,
    (typeof messages)[number]
  >();

  const nombreNonLusParConversation = new Map<string, number>();

  for (const message of messages) {
    if (!dernierMessageParConversation.has(message.conversation_id)) {
      dernierMessageParConversation.set(message.conversation_id, message);
    }

    if (message.expediteur_id !== user.id && message.lu_at === null) {
      const nombreActuel =
        nombreNonLusParConversation.get(message.conversation_id) ?? 0;

      nombreNonLusParConversation.set(
        message.conversation_id,
        nombreActuel + 1,
      );
    }
  }

  const conversationsAffichees = conversationsActives
    .map((conversation) => {
      const sortie = sortiesParId.get(conversation.sortie_id);

      if (!sortie) {
        return null;
      }
      const interlocuteurId =
        conversation.utilisateur_id === user.id
          ? sortie.organisateur_id
          : conversation.utilisateur_id;

      const interlocuteur = profilsParId.get(interlocuteurId);

      const dernierMessage = dernierMessageParConversation.get(conversation.id);

      const nombreNonLus =
        nombreNonLusParConversation.get(conversation.id) ?? 0;

      return {
        conversation,
        sortie,
        interlocuteur,
        dernierMessage,
        nombreNonLus,
      };
    })
    .filter(
      (element): element is NonNullable<typeof element> => element !== null,
    )
    .sort((a, b) => {
      const dateA = new Date(
        a.dernierMessage?.created_at ?? a.conversation.created_at,
      ).getTime();

      const dateB = new Date(
        b.dernierMessage?.created_at ?? b.conversation.created_at,
      ).getTime();

      return dateB - dateA;
    });

  const conversationsAvecNonLus = conversationsAffichees
    .filter((element) => element.nombreNonLus > 0)
    .map((element) => element.conversation.id);

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* TITRE */}

      <div
        className={
          conversationsAvecNonLus.length > 0
            ? "mb-3 flex items-center justify-end gap-4 md:mb-6 md:justify-between"
            : "hidden md:mb-6 md:flex"
        }
      >
        <h1 className="hidden text-3xl font-bold md:block">Messages</h1>

        {conversationsAvecNonLus.length > 0 && (
          <ToutMarquerLuButton conversationIds={conversationsAvecNonLus} />
        )}
      </div>

      {/* CONVERSATIONS */}

      <div className="space-y-2">
        {conversationsAffichees.map(
          ({
            conversation,
            sortie,
            interlocuteur,
            dernierMessage,
            nombreNonLus,
          }) => {
            const texteDernierMessage =
              dernierMessage?.contenu ?? "Aucun message pour le moment.";

            const apercu =
              texteDernierMessage.length > 100
                ? `${texteDernierMessage.slice(0, 100)}…`
                : texteDernierMessage;

            const dateActivite =
              dernierMessage?.created_at ?? conversation.created_at;

            const estNonLue = nombreNonLus > 0;

            return (
              <Card
                key={conversation.id}
                className={
                  estNonLue
                    ? "overflow-hidden border-primary-strong/40 bg-primary/5"
                    : "overflow-hidden"
                }
              >
                <Link
                  href={`/messages/${conversation.id}`}
                  className="
              block
              p-4
              transition-colors
              hover:bg-accent/50
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-inset
              focus-visible:ring-ring
            "
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <AvatarUtilisateur
                      nom={interlocuteur?.nom}
                      utilisateurId={interlocuteur?.id}
                      taille="md"
                    />

                    <div className="min-w-0 flex-1">
                      {/* PREMIÈRE LIGNE */}

                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2
                            className={
                              estNonLue
                                ? "truncate font-semibold"
                                : "truncate font-medium"
                            }
                          >
                            {interlocuteur?.nom ?? "Utilisateur"}
                          </h2>

                          {estNonLue && (
                            <Badge
                              variant="secondary"
                              className="
              shrink-0
              border-primary-strong/30
              bg-primary/15
              text-primary-strong
            "
                            >
                              {nombreNonLus}{" "}
                              {nombreNonLus === 1 ? "non lu" : "non lus"}
                            </Badge>
                          )}
                        </div>

                        <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {afficherDateRelative(dateActivite)}
                        </p>
                      </div>

                      {/* SORTIE */}

                      <p className="mt-1 truncate text-sm font-medium">
                        {sortie.titre}
                      </p>

                      {/* DERNIER MESSAGE */}

                      <p
                        className={
                          estNonLue
                            ? "mt-1 truncate text-sm font-medium text-foreground"
                            : "mt-1 truncate text-sm text-muted-foreground"
                        }
                      >
                        {apercu}
                      </p>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          },
        )}
      </div>

      {/* CONSERVATION */}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Les conversations sont accessibles jusqu&apos;à 12 h après la fin de la
        sortie. Les messages sont supprimés après 12 mois.
      </p>
    </main>
  );
}
