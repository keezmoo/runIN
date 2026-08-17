export default function ConfidentialitePage() {

    return (

        <main
            className="
                mx-auto
                max-w-3xl
                px-4
                py-8
                text-zinc-200
            "
        >

            <h1
                className="
                    text-2xl
                    font-bold
                    text-white
                "
            >
                Politique de confidentialité
            </h1>


            <p className="mt-2 text-sm text-zinc-400">
                Dernière mise à jour : 17 août 2026
            </p>


            <div className="mt-8 space-y-8">


                {/* --------------------------------------- */}
                {/* RESPONSABLE */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        1. Responsable du traitement
                    </h2>


                    <div
                        className="
                            mt-3
                            space-y-2
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <p>
                            runIN est un service permettant
                            aux utilisateurs de proposer,
                            rechercher et rejoindre des
                            sorties de course à pied et de
                            trail.
                        </p>


                        <p>
                            Responsable du traitement :
                            <strong className="text-white">
                                {" "}
                                [À COMPLÉTER]
                            </strong>
                        </p>


                        <p>
                            Contact pour toute question
                            relative aux données personnelles :
                            <strong className="text-white">
                                {" "}
                                [E-MAIL À COMPLÉTER]
                            </strong>
                        </p>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* DONNÉES */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        2. Données collectées
                    </h2>


                    <div
                        className="
                            mt-3
                            space-y-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <p>
                            runIN collecte uniquement les
                            données nécessaires au
                            fonctionnement du service.
                        </p>


                        <ul
                            className="
                                list-disc
                                space-y-1
                                pl-5
                            "
                        >
                            <li>
                                adresse e-mail ;
                            </li>

                            <li>
                                informations du profil,
                                telles que le nom ou
                                pseudonyme, l&apos;âge,
                                le sexe et la description ;
                            </li>

                            <li>
                                localisation et rayon de
                                recherche renseignés dans
                                le profil ;
                            </li>

                            <li>
                                informations relatives aux
                                sorties créées ou rejointes ;
                            </li>

                            <li>
                                demandes de participation ;
                            </li>

                            <li>
                                messages échangés dans
                                runIN ;
                            </li>

                            <li>
                                notifications et préférences
                                de notification ;
                            </li>

                            <li>
                                données techniques
                                nécessaires à
                                l&apos;authentification et
                                à la sécurité du compte.
                            </li>
                        </ul>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* FINALITÉS */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        3. Pourquoi ces données sont-elles utilisées ?
                    </h2>


                    <ul
                        className="
                            mt-3
                            list-disc
                            space-y-1
                            pl-5
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <li>
                            créer et gérer votre compte ;
                        </li>

                        <li>
                            afficher votre profil aux autres
                            utilisateurs ;
                        </li>

                        <li>
                            rechercher des sorties adaptées
                            à votre localisation ;
                        </li>

                        <li>
                            créer, rejoindre et gérer des
                            sorties ;
                        </li>

                        <li>
                            permettre les échanges entre
                            utilisateurs ;
                        </li>

                        <li>
                            envoyer les notifications liées
                            à l&apos;activité du service ;
                        </li>

                        <li>
                            assurer la sécurité des comptes
                            et du service.
                        </li>

                    </ul>

                </section>


                {/* --------------------------------------- */}
                {/* BASES LÉGALES */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        4. Base légale
                    </h2>


                    <div
                        className="
                            mt-3
                            space-y-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <p>
                            Les traitements nécessaires à
                            la création du compte et au
                            fonctionnement de runIN sont
                            réalisés afin de fournir le
                            service demandé par
                            l&apos;utilisateur.
                        </p>


                        <p>
                            Certains traitements nécessaires
                            à la sécurité et à la prévention
                            des abus peuvent également
                            reposer sur l&apos;intérêt
                            légitime de runIN à protéger
                            son service et ses utilisateurs.
                        </p>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* DESTINATAIRES */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        5. Qui peut accéder aux données ?
                    </h2>


                    <div
                        className="
                            mt-3
                            space-y-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <p>
                            Certaines informations du profil
                            et des sorties sont visibles par
                            les autres utilisateurs
                            connectés lorsque cela est
                            nécessaire au fonctionnement de
                            runIN.
                        </p>


                        <p>
                            Des prestataires techniques
                            peuvent également traiter
                            certaines données uniquement
                            pour permettre le fonctionnement
                            du service.
                        </p>


                        <p>
                            runIN utilise notamment
                            Supabase pour la base de données
                            et l&apos;authentification,
                            Vercel pour l&apos;hébergement
                            de l&apos;application et Resend
                            pour certains e-mails.
                        </p>


                        <p>
                            Les données personnelles ne sont
                            pas vendues à des annonceurs.
                        </p>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* CONSERVATION */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        6. Durée de conservation
                    </h2>


                    <div
                        className="
        mt-3
        space-y-3
        text-sm
        leading-6
        text-zinc-300
    "
                    >

                        <p>
                            Les données du compte et du profil sont
                            conservées tant que le compte runIN reste actif.
                        </p>

                        <p>
                            Les notifications sont conservées pendant
                            une durée maximale de 6 mois.
                        </p>

                        <p>
                            Les messages échangés dans runIN sont
                            conservés pendant une durée maximale de
                            12 mois.
                        </p>

                        <p>
                            Les informations relatives aux sorties,
                            participations et demandes peuvent être
                            conservées dans l&apos;historique du compte
                            tant que celui-ci existe.
                        </p>

                        <p>
                            Lorsque vous supprimez votre compte, les
                            données personnelles qui lui sont associées
                            sont supprimées, sous réserve
                            d&apos;éventuelles obligations légales ou
                            copies techniques temporaires nécessaires
                            aux sauvegardes et à la sécurité du service.
                        </p>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* DROITS */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        7. Vos droits
                    </h2>


                    <div
                        className="
                            mt-3
                            space-y-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >

                        <p>
                            Selon les conditions prévues par
                            la réglementation applicable,
                            vous pouvez notamment exercer
                            vos droits d&apos;accès, de
                            rectification, d&apos;effacement,
                            de limitation, d&apos;opposition
                            et de portabilité.
                        </p>


                        <p>
                            Plusieurs de ces actions peuvent
                            être réalisées directement
                            depuis votre profil et les
                            paramètres de votre compte.
                        </p>


                        <p>
                            Pour toute autre demande,
                            contactez :
                            <strong className="text-white">
                                {" "}
                                [E-MAIL À COMPLÉTER]
                            </strong>
                        </p>


                        <p>
                            Vous pouvez également introduire
                            une réclamation auprès de la
                            Commission nationale de
                            l&apos;informatique et des
                            libertés (CNIL).
                        </p>

                    </div>

                </section>


                {/* --------------------------------------- */}
                {/* COOKIES */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        8. Cookies et stockage local
                    </h2>


                    <p
                        className="
                            mt-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >
                        runIN utilise les mécanismes
                        techniques nécessaires au
                        fonctionnement du service,
                        notamment pour maintenir votre
                        session et sécuriser votre
                        authentification. Aucun dispositif
                        publicitaire ou de suivi marketing
                        n&apos;est actuellement utilisé.
                    </p>

                </section>


                {/* --------------------------------------- */}
                {/* MODIFICATIONS */}
                {/* --------------------------------------- */}

                <section>

                    <h2
                        className="
                            text-lg
                            font-semibold
                            text-white
                        "
                    >
                        9. Modification de cette politique
                    </h2>


                    <p
                        className="
                            mt-3
                            text-sm
                            leading-6
                            text-zinc-300
                        "
                    >
                        Cette politique pourra être mise à
                        jour lorsque les fonctionnalités de
                        runIN ou les traitements de données
                        évoluent. La date de dernière mise
                        à jour est indiquée en haut de cette
                        page.
                    </p>

                </section>

            </div>

        </main>

    );

}