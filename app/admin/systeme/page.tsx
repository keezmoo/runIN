import Link from "next/link";

export const dynamic =
    "force-dynamic";


function Etat({
    actif,
}: {
    actif: boolean;
}) {
    return (
        <span
            className={`
                rounded-full
                border
                px-2
                py-1
                text-xs

                ${
                    actif
                        ? "border-green-800 text-green-400"
                        : "border-orange-800 text-orange-400"
                }
            `}
        >
            {actif
                ? "Configuré"
                : "Non détecté"}
        </span>
    );
}


export default function SystemeAdminPage() {

    const supabaseConfigure =
        Boolean(
            process.env
                .NEXT_PUBLIC_SUPABASE_URL
        ) &&
        Boolean(
            process.env
                .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        );


    const captchaConfigure =
        Boolean(
            process.env
                .NEXT_PUBLIC_HCAPTCHA_SITE_KEY
        );


    const surVercel =
        Boolean(
            process.env.VERCEL
        );


    const environnement =
        process.env.VERCEL_ENV ??
        "local";


    const deploiement =
        process.env.VERCEL_URL ??
        "localhost";


    return (
        <main
            className="
                mx-auto
                max-w-5xl
                space-y-8
                p-6
            "
        >

            {/* EN-TÊTE */}

            <div>

                <Link
                    href="/admin"
                    className="
                        text-sm
                        text-gray-500
                        hover:underline
                    "
                >
                    ← Administration
                </Link>


                <h1
                    className="
                        mt-3
                        text-2xl
                        font-bold
                    "
                >
                    Système
                </h1>


                <p
                    className="
                        mt-1
                        text-sm
                        text-gray-500
                    "
                >
                    Accès aux services techniques
                    utilisés par runIN.
                </p>

            </div>


            {/* ENVIRONNEMENT */}

            <section>

                <h2
                    className="
                        mb-3
                        text-lg
                        font-semibold
                    "
                >
                    Environnement
                </h2>


                <div
                    className="
                        grid
                        gap-4
                        md:grid-cols-3
                    "
                >

                    <div
                        className="
                            rounded-xl
                            border
                            p-5
                        "
                    >

                        <p
                            className="
                                text-sm
                                text-gray-500
                            "
                        >
                            Environnement
                        </p>

                        <p
                            className="
                                mt-1
                                font-medium
                            "
                        >
                            {environnement}
                        </p>

                    </div>


                    <div
                        className="
                            rounded-xl
                            border
                            p-5
                        "
                    >

                        <p
                            className="
                                text-sm
                                text-gray-500
                            "
                        >
                            Hébergement
                        </p>

                        <div className="mt-2">

                            <Etat
                                actif={
                                    surVercel
                                }
                            />

                        </div>

                    </div>


                    <div
                        className="
                            rounded-xl
                            border
                            p-5
                        "
                    >

                        <p
                            className="
                                text-sm
                                text-gray-500
                            "
                        >
                            Déploiement
                        </p>

                        <p
                            className="
                                mt-1
                                break-all
                                text-sm
                            "
                        >
                            {deploiement}
                        </p>

                    </div>

                </div>

            </section>


            {/* CONFIGURATION */}

            <section>

                <h2
                    className="
                        mb-3
                        text-lg
                        font-semibold
                    "
                >
                    Configuration
                </h2>


                <div
                    className="
                        grid
                        gap-4
                        md:grid-cols-2
                    "
                >

                    <div
                        className="
                            rounded-xl
                            border
                            p-5
                        "
                    >

                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                gap-3
                            "
                        >

                            <h3 className="font-medium">
                                Supabase
                            </h3>

                            <Etat
                                actif={
                                    supabaseConfigure
                                }
                            />

                        </div>


                        <p
                            className="
                                mt-3
                                text-sm
                                text-gray-500
                            "
                        >
                            Base de données,
                            authentification,
                            RLS et RPC.
                        </p>

                    </div>


                    <div
                        className="
                            rounded-xl
                            border
                            p-5
                        "
                    >

                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                gap-3
                            "
                        >

                            <h3 className="font-medium">
                                hCaptcha
                            </h3>

                            <Etat
                                actif={
                                    captchaConfigure
                                }
                            />

                        </div>


                        <p
                            className="
                                mt-3
                                text-sm
                                text-gray-500
                            "
                        >
                            Protection des formulaires
                            d&apos;authentification.
                        </p>

                    </div>

                </div>


                <p
                    className="
                        mt-3
                        text-xs
                        text-gray-500
                    "
                >
                    Cette page indique uniquement si
                    certaines variables sont présentes.
                    Aucune clé secrète n&apos;est affichée.
                </p>

            </section>


            {/* SERVICES */}

            <section>

                <h2
                    className="
                        mb-3
                        text-lg
                        font-semibold
                    "
                >
                    Services externes
                </h2>


                <div
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                    "
                >

                    <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="
                            rounded-xl
                            border
                            p-5
                            transition
                            hover:bg-zinc-900
                        "
                    >
                        <h3 className="font-semibold">
                            Vercel
                        </h3>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-gray-500
                            "
                        >
                            Déploiements, logs,
                            domaines et variables
                            d&apos;environnement.
                        </p>

                        <p
                            className="
                                mt-4
                                text-sm
                                text-[#8ED8B6]
                            "
                        >
                            Ouvrir Vercel ↗
                        </p>
                    </a>


                    <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="
                            rounded-xl
                            border
                            p-5
                            transition
                            hover:bg-zinc-900
                        "
                    >
                        <h3 className="font-semibold">
                            Supabase
                        </h3>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-gray-500
                            "
                        >
                            Base de données,
                            authentification,
                            logs et sauvegardes.
                        </p>

                        <p
                            className="
                                mt-4
                                text-sm
                                text-[#8ED8B6]
                            "
                        >
                            Ouvrir Supabase ↗
                        </p>
                    </a>


                    <a
                        href="https://resend.com/emails"
                        target="_blank"
                        rel="noreferrer"
                        className="
                            rounded-xl
                            border
                            p-5
                            transition
                            hover:bg-zinc-900
                        "
                    >
                        <h3 className="font-semibold">
                            Resend
                        </h3>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-gray-500
                            "
                        >
                            Suivi des e-mails
                            transactionnels.
                        </p>

                        <p
                            className="
                                mt-4
                                text-sm
                                text-[#8ED8B6]
                            "
                        >
                            Ouvrir Resend ↗
                        </p>
                    </a>


                    <a
                        href="https://github.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="
                            rounded-xl
                            border
                            p-5
                            transition
                            hover:bg-zinc-900
                        "
                    >
                        <h3 className="font-semibold">
                            GitHub
                        </h3>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-gray-500
                            "
                        >
                            Code source,
                            historique Git
                            et versions.
                        </p>

                        <p
                            className="
                                mt-4
                                text-sm
                                text-[#8ED8B6]
                            "
                        >
                            Ouvrir GitHub ↗
                        </p>
                    </a>

                </div>

            </section>


            {/* SAUVEGARDES */}

            <section
                className="
                    rounded-xl
                    border
                    p-5
                "
            >

                <h2 className="font-semibold">
                    Sauvegardes
                </h2>


                <p
                    className="
                        mt-2
                        text-sm
                        text-gray-500
                    "
                >
                    Les sauvegardes et restaurations
                    doivent être gérées depuis
                    Supabase et l&apos;infrastructure
                    de production.
                </p>


                <p
                    className="
                        mt-3
                        text-sm
                    "
                >
                    runIN ne propose volontairement
                    aucun bouton de restauration
                    complète de la base depuis
                    l&apos;interface administrateur.
                </p>

            </section>

        </main>
    );
}