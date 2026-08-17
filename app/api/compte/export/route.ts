import {
    createServerClient,
} from "@supabase/ssr";

import {
    cookies,
} from "next/headers";


export const dynamic =
    "force-dynamic";


export async function GET() {

    try {

        // ------------------------------------------------
        // CLIENT SUPABASE DE L'UTILISATEUR CONNECTÉ
        // ------------------------------------------------

        const cookieStore =
            await cookies();


        const supabase =
            createServerClient(
                process.env
                    .NEXT_PUBLIC_SUPABASE_URL!,
                process.env
                    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                {
                    cookies: {

                        getAll() {
                            return cookieStore
                                .getAll();
                        },

                        setAll(
                            cookiesToSet
                        ) {

                            try {

                                cookiesToSet
                                    .forEach(
                                        ({
                                            name,
                                            value,
                                            options,
                                        }) => {

                                            cookieStore
                                                .set(
                                                    name,
                                                    value,
                                                    options
                                                );

                                        }
                                    );

                            } catch {

                                // Rien à faire ici.

                            }

                        },

                    },
                }
            );


        // ------------------------------------------------
        // UTILISATEUR
        // ------------------------------------------------

        const {
            data: {
                user,
            },
            error: userError,
        } =
            await supabase.auth
                .getUser();


        if (
            userError ||
            !user
        ) {

            return Response.json(
                {
                    error:
                        "Utilisateur non authentifié.",
                },
                {
                    status: 401,
                }
            );

        }


        // ------------------------------------------------
        // MFA
        // ------------------------------------------------

        const {
            data: aal,
            error: aalError,
        } =
            await supabase.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (aalError) {

            return Response.json(
                {
                    error:
                        "Impossible de vérifier la sécurité de la session.",
                },
                {
                    status: 500,
                }
            );

        }


        if (
            aal.nextLevel === "aal2" &&
            aal.currentLevel !== "aal2"
        ) {

            return Response.json(
                {
                    error:
                        "Une vérification à deux facteurs est nécessaire.",
                    code:
                        "mfa_required",
                },
                {
                    status: 403,
                }
            );

        }


        // ------------------------------------------------
        // DONNÉES RUNIN
        // ------------------------------------------------

        const [
            profilResult,
            sortiesResult,
            participationsResult,
            demandesResult,
            messagesResult,
            notificationsResult,
        ] =
            await Promise.all([

                supabase
                    .from("profiles")
                    .select("*")
                    .eq(
                        "id",
                        user.id
                    )
                    .maybeSingle(),

                supabase
                    .from("sorties")
                    .select("*")
                    .eq(
                        "organisateur_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true,
                        }
                    ),

                supabase
                    .from("participations")
                    .select("*")
                    .eq(
                        "utilisateur_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true,
                        }
                    ),

                supabase
                    .from(
                        "demandes_participation"
                    )
                    .select("*")
                    .eq(
                        "utilisateur_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true,
                        }
                    ),

                supabase
                    .from("messages")
                    .select("*")
                    .eq(
                        "expediteur_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true,
                        }
                    ),

                supabase
                    .from("notifications")
                    .select("*")
                    .eq(
                        "utilisateur_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true,
                        }
                    ),

            ]);


        // ------------------------------------------------
        // VÉRIFICATION DES REQUÊTES
        // ------------------------------------------------

        const erreurDonnees =
            profilResult.error ||
            sortiesResult.error ||
            participationsResult.error ||
            demandesResult.error ||
            messagesResult.error ||
            notificationsResult.error;


        if (erreurDonnees) {

            console.error(
                "Erreur export données :",
                erreurDonnees
            );

            return Response.json(
                {
                    error:
                        "Impossible de préparer l'export des données.",
                },
                {
                    status: 500,
                }
            );

        }


        // ------------------------------------------------
        // FICHIER À EXPORTER
        // ------------------------------------------------

        const donneesExportees = {

            informations_export: {
                service:
                    "runIN",

                date_export:
                    new Date()
                        .toISOString(),

                format:
                    "JSON",
            },


            compte: {

                id:
                    user.id,

                email:
                    user.email ?? null,

                date_creation:
                    user.created_at,

            },


            profil:
                profilResult.data,


            sorties_creees:
                sortiesResult.data ?? [],


            participations:
                participationsResult.data ?? [],


            demandes_participation:
                demandesResult.data ?? [],


            messages_envoyes:
                messagesResult.data ?? [],


            notifications_recues:
                notificationsResult.data ?? [],

        };


        // ------------------------------------------------
        // NOM DU FICHIER
        // ------------------------------------------------

        const date =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );


        const contenu =
            JSON.stringify(
                donneesExportees,
                null,
                2
            );


        return new Response(
            contenu,
            {
                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Content-Disposition":
                        `attachment; filename="runin-mes-donnees-${date}.json"`,

                    "Cache-Control":
                        "no-store",

                },
            }
        );


    } catch (error) {

        console.error(
            "Erreur inattendue export :",
            error
        );


        return Response.json(
            {
                error:
                    "Une erreur inattendue est survenue.",
            },
            {
                status: 500,
            }
        );

    }

}