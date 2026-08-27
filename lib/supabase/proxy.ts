import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { hasEnvVars } from "../utils";


export async function updateSession(
  request: NextRequest
) {

  let supabaseResponse =
    NextResponse.next({
      request,
    });


  if (!hasEnvVars) {
    return supabaseResponse;
  }


  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {
        cookies: {

          getAll() {
            return request.cookies
              .getAll();
          },


          setAll(
            cookiesToSet
          ) {

            cookiesToSet.forEach(
              ({
                name,
                value,
              }) =>
                request.cookies.set(
                  name,
                  value
                )
            );


            supabaseResponse =
              NextResponse.next({
                request,
              });


            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) =>
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                )
            );

          },

        },
      }
    );


  // IMPORTANT :
  // garder getClaims juste après
  // la création du client Supabase.

  const {
    data,
  } =
    await supabase.auth
      .getClaims();


  const user =
    data?.claims;


  const pathname =
    request.nextUrl.pathname;


  // ------------------------------------------------
  // REDIRECTION EN CONSERVANT LES COOKIES SUPABASE
  // ------------------------------------------------

  function rediriger(
    destination: string
  ) {

    const url =
      request.nextUrl.clone();

    url.pathname =
      destination;

    url.search = "";


    const response =
      NextResponse.redirect(
        url
      );


    // Important si Supabase vient
    // de rafraîchir la session.

    for (
      const cookie
      of supabaseResponse.cookies.getAll()
    ) {
      response.cookies.set(
        cookie
      );
    }


    return response;
  }


  // ------------------------------------------------
  // UTILISATEUR NON CONNECTÉ
  // ------------------------------------------------

  if (
    pathname !== "/" &&
    !user &&
    !pathname.startsWith(
      "/login"
    ) &&
    !pathname.startsWith(
      "/auth"
    )
  ) {

    return rediriger(
      "/auth/login"
    );

  }


  // ------------------------------------------------
  // COMPTE SANCTIONNÉ
  // ------------------------------------------------

  if (user) {

    // Ces routes doivent rester accessibles
    // à un utilisateur sanctionné.
    //
    // /auth permet notamment la déconnexion.
    // Les routes compte sont conservées pour
    // les droits liés aux données personnelles.

    const routeAutorisee =
      pathname === "/sanction" ||

      pathname.startsWith(
        "/auth"
      ) ||

      pathname ===
      "/confidentialite" ||

      pathname.startsWith(
        "/api/compte/"
      );


    if (!routeAutorisee) {

      const {
        data: sanctionData,
        error: sanctionError,
      } =
        await supabase.rpc(
          "ma_sanction_active"
        );


      if (sanctionError) {

        console.error(
          "Erreur contrôle sanction :",
          {
            code:
              sanctionError.code,

            message:
              sanctionError.message,

            details:
              sanctionError.details,

            hint:
              sanctionError.hint,
          }
        );

      } else if (
        sanctionData &&
        sanctionData.length > 0
      ) {

        return rediriger(
          "/sanction"
        );

      }

    }

  }


  return supabaseResponse;
}