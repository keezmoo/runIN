import Link from "next/link";
import { redirect } from "next/navigation";
import ToutMarquerLuButton from "./tout-marquer-lu-button";
import { createClient } from "@/lib/supabase/server";

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
  // UTILISATEURS INDISPONIBLES
  // ------------------------------------------------

  const {
    data: utilisateursIndisponiblesData,
    error: utilisateursIndisponiblesError,
  } = await supabase.rpc("mes_utilisateurs_indisponibles");

  if (utilisateursIndisponiblesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger les conversations.</p>
      </main>
    );
  }

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesData ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  // ------------------------------------------------
  // CONVERSATIONS ACCESSIBLES
  // ------------------------------------------------

  const { data: conversations, error: conversationsError } = await supabase
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
    });

  if (conversationsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger les conversations.</p>
      </main>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Messages</h1>

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
        <p>Impossible de charger les sorties.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // CONVERSATIONS ENCORE ACTIVES
  // ------------------------------------------------

  const maintenant = Date.now();

  const conversationsActives = conversations.filter((conversation) => {
    const sortie = (sorties ?? []).find(
      (sortie) => sortie.id === conversation.sortie_id,
    );

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
        <h1 className="mb-6 text-3xl font-bold">Messages</h1>

        <p className="text-gray-500">
          Vous n&apos;avez aucune conversation active.
        </p>
      </main>
    );
  }

  // ------------------------------------------------
  // INTERLOCUTEURS
  // ------------------------------------------------

  const idsInterlocuteurs = conversationsActives.map((conversation) => {
    const sortie = (sorties ?? []).find(
      (sortie) => sortie.id === conversation.sortie_id,
    );

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

  const { data: profils, error: profilsError } = await supabase
    .from("profiles")
    .select(
      `
            id,
            nom
        `,
    )
    .in("id", idsInterlocuteursUniques);

  if (profilsError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger les interlocuteurs.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // DERNIERS MESSAGES
  // ------------------------------------------------

  const idsConversations = conversationsActives.map(
    (conversation) => conversation.id,
  );

  const { data: messages, error: messagesError } = await supabase
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
    });

  if (messagesError) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Impossible de charger les messages.</p>
      </main>
    );
  }

  // ------------------------------------------------
  // PRÉPARATION DE L'AFFICHAGE
  // ------------------------------------------------

  const conversationsAffichees = conversationsActives
    .map((conversation) => {
      const sortie = (sorties ?? []).find(
        (sortie) => sortie.id === conversation.sortie_id,
      );

      if (!sortie) {
        return null;
      }
      const interlocuteurId =
        conversation.utilisateur_id === user.id
          ? sortie.organisateur_id
          : conversation.utilisateur_id;

      const interlocuteur = (profils ?? []).find(
        (profil) => profil.id === interlocuteurId,
      );

      // Les messages sont déjà triés
      // du plus récent au plus ancien
      const dernierMessage = (messages ?? []).find(
        (message) => message.conversation_id === conversation.id,
      );

      const nombreNonLus = (messages ?? []).filter(
        (message) =>
          message.conversation_id === conversation.id &&
          message.expediteur_id !== user.id &&
          message.lu_at === null,
      ).length;

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

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Messages</h1>

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

            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="
                relative
                block
                overflow-hidden
                rounded
                border
                px-4
                py-3
                transition
                hover:bg-gray-500/5

                after:absolute
                after:bottom-0
                after:left-0
                after:h-[3px]
                after:w-full
                after:origin-left
                after:scale-x-0
                after:bg-[#8ED8B6]
                after:transition-transform
                after:duration-200

                hover:after:scale-x-100
              "
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* INTERLOCUTEUR */}

                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">
                        {interlocuteur?.nom ?? "Utilisateur"}
                      </h2>

                      {nombreNonLus > 0 && (
                        <span
                          className="
                          rounded-full
                          bg-[#8ED8B6]
                          px-2
                          py-0.5
                          text-xs
                          font-semibold
                          text-black
                        "
                        >
                          {nombreNonLus === 1
                            ? "1 nouveau message"
                            : `${nombreNonLus} nouveaux messages`}
                        </span>
                      )}
                    </div>

                    {/* SORTIE */}

                    <p className="mt-1 text-sm font-medium">{sortie.titre}</p>

                    {/* DERNIER MESSAGE */}

                    <p className="mt-1 truncate text-sm text-gray-500">
                      {apercu}
                    </p>
                  </div>

                  {/* DATE */}

                  <p className="shrink-0 text-xs text-gray-500">
                    {afficherDateRelative(dateActivite)}
                  </p>
                </div>
              </Link>
            );
          },
        )}
      </div>

      {/* CONSERVATION */}

      <p
        className="
        mt-10
        text-center
        text-xs
        text-gray-500
      "
      >
        Les conversations sont accessibles jusqu&apos;à 12 h après la fin de la
        sortie. Les messages sont supprimés après 12 mois.
      </p>
    </main>
  );
}
