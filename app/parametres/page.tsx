import NotificationsEmailButton
    from "../profil/notifications-email-button";
import CompteParametres
    from "./compte-parametres";
import SuppressionCompte from "./suppression-compte";
import MfaParametres from "./mfa-parametres";
import SessionsParametres from "./sessions-parametres";
import Link from "next/link";

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

            {/* MFA parametre */}

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
                    Sécurité
                </h2>

                <div className="mt-4">

                    <MfaParametres />
                    <div className="my-6 border-t border-zinc-800" />

                    <SessionsParametres />
                </div>

            </section>

            {/* CONFIDENTIALITÉ */}
            <section
                className="
        mb-8
        rounded-xl
        border
        border-zinc-800
        bg-zinc-900
        p-4
    "
            >

                <h2 className="mb-4 text-lg font-semibold">
                    Confidentialité
                </h2>


                <div className="space-y-4">

                    <div>

                        <p className="font-medium text-white">
                            Données personnelles
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                            Consultez les informations concernant
                            l&apos;utilisation et la protection de
                            vos données personnelles.
                        </p>

                    </div>


                    <Link
                        href="/confidentialite"
                        className="
                inline-block
                rounded-lg
                border
                border-zinc-700
                bg-zinc-800
                px-4
                py-2
                text-sm
                font-medium
                text-white
                hover:bg-zinc-700
            "
                    >
                        Politique de confidentialité
                    </Link>


                    <div className="border-t border-zinc-800 pt-4">

                        <p className="text-sm text-zinc-400">
                            Vous pouvez télécharger une copie des
                            principales données associées à votre
                            compte runIN.
                        </p>


                        <a
                            href="/api/compte/export"
                            className="
                    mt-3
                    inline-block
                    rounded-lg
                    border
                    border-zinc-700
                    bg-zinc-800
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-white
                    hover:bg-zinc-700
                "
                        >
                            Télécharger mes données
                        </a>

                    </div>

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