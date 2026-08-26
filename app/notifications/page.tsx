import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ToutMarquerLuButton from "./tout-marquer-lu-button";
import NotificationLink from "./notification-link";

function afficherDateNotification(dateTexte: string) {
  const date = new Date(dateTexte);
  const maintenant = new Date();

  const differenceMs = maintenant.getTime() - date.getTime();

  const differenceMinutes = Math.floor(differenceMs / (1000 * 60));

  if (differenceMinutes < 1) {
    return "À l'instant";
  }

  if (differenceMinutes < 60) {
    return `Il y a ${differenceMinutes} min`;
  }

  const differenceHeures = Math.floor(differenceMinutes / 60);

  if (differenceHeures < 24) {
    return `Il y a ${differenceHeures} h`;
  }

  const dateNotification = date.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
  });

  const hier = new Date(
    maintenant.getTime() - 24 * 60 * 60 * 1000,
  ).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
  });

  const heure = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

  if (dateNotification === hier) {
    return `Hier à ${heure}`;
  }

  const memeAnnee =
    date.toLocaleDateString("fr-FR", {
      year: "numeric",
      timeZone: "Europe/Paris",
    }) ===
    maintenant.toLocaleDateString("fr-FR", {
      year: "numeric",
      timeZone: "Europe/Paris",
    });

  if (memeAnnee) {
    const jour = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Paris",
    });

    return `${jour} à ${heure}`;
  }

  const dateLongue = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  return `${dateLongue} à ${heure}`;
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  // ------------------------------------------------
  // UTILISATEUR
  // ------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // DONNÉES
  // ------------------------------------------------

  const [utilisateursIndisponiblesResult, notificationsResult] =
    await Promise.all([
      supabase.rpc("mes_utilisateurs_indisponibles"),

      supabase
        .from("notifications")
        .select(
          `
          id,
          acteur_id,
          titre,
          contenu,
          lien,
          created_at,
          lu_at
        `,
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

  if (utilisateursIndisponiblesResult.error || notificationsResult.error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-2xl font-bold">Notifications</h1>

        <p>Impossible de charger les notifications.</p>
      </main>
    );
  }

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesResult.data ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  const notifications = notificationsResult.data ?? [];

  const listeNotifications = notifications.filter(
    (notification) =>
      !notification.acteur_id || !idsIndisponibles.has(notification.acteur_id),
  );

  const nombreNonLues = listeNotifications.filter(
    (notification) => notification.lu_at === null,
  ).length;

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div
        className="
        mb-6
        flex
        items-start
        justify-between
        gap-4
    "
      >
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>

          {nombreNonLues > 0 ? (
            <p className="mt-1 text-sm text-gray-500">
              {nombreNonLues === 1
                ? "1 notification non lue"
                : `${nombreNonLues} notifications non lues`}
            </p>
          ) : listeNotifications.length > 0 ? (
            <p className="mt-1 text-sm text-gray-500">
              Aucune notification non lue
            </p>
          ) : null}
        </div>

        <ToutMarquerLuButton nombreNonLues={nombreNonLues} />
      </div>

      {listeNotifications.length === 0 ? (
        <p className="text-gray-500">Vous n&apos;avez aucune notification.</p>
      ) : (
        <div className="space-y-3">
          {listeNotifications.map((notification) => {
            const estNonLue = notification.lu_at === null;

            const contenu = (
              <div
                className={`
                                        rounded
                                        border
                                        p-4
                                        transition

                                        ${estNonLue ? "bg-[#8ED8B6]/10" : ""}
                                    `}
              >
                <div
                  className="
                                            flex
                                            items-start
                                            justify-between
                                            gap-3
                                        "
                >
                  <div>
                    <p className={estNonLue ? "font-semibold" : "font-medium"}>
                      {notification.titre}
                    </p>

                    {notification.contenu && (
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.contenu}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      {afficherDateNotification(notification.created_at)}
                    </p>
                  </div>

                  {estNonLue && (
                    <span
                      className="
                                                    mt-1
                                                    h-2.5
                                                    w-2.5
                                                    shrink-0
                                                    rounded-full
                                                    bg-[#8ED8B6]
                                                "
                      title="Non lue"
                    />
                  )}
                </div>
              </div>
            );

            // Notification avec destination
            if (notification.lien) {
              return (
                <NotificationLink
                  key={notification.id}
                  notificationId={notification.id}
                  href={notification.lien}
                  estNonLue={estNonLue}
                >
                  {contenu}
                </NotificationLink>
              );
            }

            // Notification sans destination
            return <div key={notification.id}>{contenu}</div>;
          })}
        </div>
      )}
      <p className="mt-10 text-center text-xs text-gray-500">
        Les notifications lues sont conservées 30 jours. Les notifications non
        lues sont conservées 90 jours.
      </p>
    </main>
  );
}
