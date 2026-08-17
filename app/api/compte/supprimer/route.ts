import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";


export async function DELETE() {

    try {

        // ----------------------------------------------------
        // 1. Client Supabase correspondant à la session
        //    actuellement présente dans le navigateur
        // ----------------------------------------------------

        const cookieStore = await cookies();


        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {

                    getAll() {
                        return cookieStore.getAll();
                    },

                    setAll(cookiesToSet) {

                        try {

                            cookiesToSet.forEach(
                                ({
                                    name,
                                    value,
                                    options,
                                }) => {

                                    cookieStore.set(
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


        // ----------------------------------------------------
        // 2. Vérification réelle de l'utilisateur
        // ----------------------------------------------------

        const {
            data: {
                user,
            },
            error: userError,
        } =
            await supabase.auth.getUser();


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

        // ----------------------------------------------------
        // Vérification du niveau MFA de la session
        // ----------------------------------------------------

        const {
            data: aal,
            error: aalError,
        } =
            await supabase.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (aalError) {

            console.error(
                "Erreur vérification niveau MFA :",
                aalError
            );


            return Response.json(
                {
                    error:
                        "Impossible de vérifier le niveau de sécurité de la session.",
                },
                {
                    status: 500,
                }
            );

        }


        // Si le compte possède un facteur MFA,
        // la session doit obligatoirement être en AAL2.

        if (
            aal.nextLevel === "aal2" &&
            aal.currentLevel !== "aal2"
        ) {

            return Response.json(
                {
                    error:
                        "Une vérification à deux facteurs est nécessaire avant de supprimer le compte.",

                    code:
                        "mfa_required",
                },
                {
                    status: 403,
                }
            );

        }

        // ----------------------------------------------------
        // 3. Client Admin
        // ----------------------------------------------------

        const supabaseAdmin =
            createAdminClient();


        // ----------------------------------------------------
        // 4. Suppression définitive de auth.users
        //
        // profiles.id possède ON DELETE CASCADE depuis
        // auth.users, puis nos autres CASCADE prennent
        // le relais.
        // ----------------------------------------------------

        const {
            error: deleteError,
        } =
            await supabaseAdmin
                .auth
                .admin
                .deleteUser(
                    user.id
                );


        if (deleteError) {

            console.error(
                "Erreur suppression utilisateur :",
                deleteError
            );


            return Response.json(
                {
                    error:
                        "Impossible de supprimer le compte.",
                },
                {
                    status: 500,
                }
            );

        }


        // ----------------------------------------------------
        // 5. Succès
        // ----------------------------------------------------

        return Response.json(
            {
                success: true,
            }
        );

    } catch (error) {

        console.error(
            "Erreur suppression compte :",
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
