import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ToutMarquerLuButton
    from "./tout-marquer-lu-button";
import NotificationLink
    from "./notification-link";

export default async function NotificationsPage() {

    const supabase =
        await createClient();


    // ------------------------------------------------
    // UTILISATEUR
    // ------------------------------------------------

    const {
        data: {
            user,
        },
    } = await supabase.auth.getUser();


    if (!user) {
        redirect("/auth/login");
    }


    // ------------------------------------------------
    // NOTIFICATIONS
    // ------------------------------------------------

    const {
        data: notifications,
        error,
    } = await supabase
        .from("notifications")
        .select(`
            id,
            type,
            titre,
            contenu,
            lien,
            created_at,
            lu_at
        `)
        .order(
            "created_at",
            {
                ascending: false,
            }
        );


    if (error) {

        console.error(
            "Erreur chargement notifications :",
            error
        );


        return (
            <main className="mx-auto max-w-2xl p-6">

                <h1 className="mb-6 text-2xl font-bold">
                    Notifications
                </h1>

                <p>
                    Impossible de charger les notifications.
                </p>

            </main>
        );
    }


    const listeNotifications =
        notifications ?? [];

    const nombreNonLues =
        listeNotifications.filter(
            (notification) =>
                notification.lu_at === null
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

                    <h1 className="text-2xl font-bold">
                        Notifications
                    </h1>


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


                <ToutMarquerLuButton
                    nombreNonLues={
                        nombreNonLues
                    }
                />

            </div>


            {listeNotifications.length === 0 ? (

                <p className="text-gray-500">
                    Vous n'avez aucune notification.
                </p>

            ) : (

                <div className="space-y-3">

                    {listeNotifications.map(
                        (notification) => {

                            const estNonLue =
                                notification.lu_at === null;


                            const contenu = (

                                <div
                                    className={`
                                        rounded
                                        border
                                        p-4
                                        transition

                                        ${estNonLue
                                            ? "bg-[#8ED8B6]/10"
                                            : ""
                                        }
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

                                            <p
                                                className={
                                                    estNonLue
                                                        ? "font-semibold"
                                                        : "font-medium"
                                                }
                                            >
                                                {notification.titre}
                                            </p>


                                            {notification.contenu && (

                                                <p className="mt-1 text-sm text-gray-600">

                                                    {
                                                        notification.contenu
                                                    }

                                                </p>

                                            )}


                                            <p className="mt-2 text-xs text-gray-500">

                                                {new Date(
                                                    notification.created_at
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
                                        key={
                                            notification.id
                                        }
                                        notificationId={
                                            notification.id
                                        }
                                        href={
                                            notification.lien
                                        }
                                        estNonLue={
                                            estNonLue
                                        }
                                    >
                                        {contenu}
                                    </NotificationLink>
                                );
                            }


                            // Notification sans destination
                            return (
                                <div
                                    key={
                                        notification.id
                                    }
                                >
                                    {contenu}
                                </div>
                            );
                        }
                    )}

                </div>

            )}

        </main>
    );
}