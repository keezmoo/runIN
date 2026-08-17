import NotificationsEmailButton
    from "../profil/notifications-email-button";
import CompteParametres
    from "./compte-parametres";
import SuppressionCompte from "./suppression-compte";

export default function ParametresPage() {

    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-6">

            <div className="mb-8">
                <h1 className="text-2xl font-semibold">
                    Paramètres
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Gérez votre compte et vos préférences runIN.
                </p>
            </div>


            {/* COMPTE */}
            <section className="mb-8">

                <h2 className="mb-3 text-lg font-semibold">
                    Compte
                </h2>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                    <CompteParametres />

                </div>

            </section>


            {/* NOTIFICATIONS */}
            <section className="mb-8">

                <h2 className="mb-3 text-lg font-semibold">
                    Notifications
                </h2>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                    <div className="mb-4">

                        <p className="font-medium">
                            Notifications par e-mail
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                            Recevez par e-mail les notifications
                            importantes liées à vos sorties.
                        </p>

                    </div>

                    <NotificationsEmailButton />

                </div>

            </section>


            {/* CONFIDENTIALITÉ */}
            <section className="mb-8">

                <h2 className="mb-3 text-lg font-semibold">
                    Confidentialité
                </h2>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                    <p className="text-sm text-gray-600">
                        Les options de visibilité du profil seront
                        disponibles ici.
                    </p>

                </div>

            </section>


            {/* COMPTE */}
            <section
                className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-900
        p-4
    "
            >

                <h2 className="text-lg font-semibold">
                    Gestion du compte
                </h2>

                <div className="mt-4">

                    <SuppressionCompte />

                </div>

            </section>

        </main>
    );
}