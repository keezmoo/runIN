"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";


// ------------------------------------------------
// LIENS DE NAVIGATION
// ------------------------------------------------

const liens = [
  {
    href: "/sorties",
    label: "Sorties",
    icone: "search",
  },
  {
    href: "/mes-sorties",
    label: "Mes sorties",
    icone: "calendar",
  },
  {
    href: "/sorties/nouvelle",
    label: "Créer",
    icone: "plus",
    principal: true,
  },
  {
    href: "/messages",
    label: "Messages",
    icone: "message",
  },
  {
    href: "/profil",
    label: "Profil",
    icone: "profile",
  },
];


type IconeProps = {
  type: string;
};


// ------------------------------------------------
// ICÔNES
// ------------------------------------------------

function Icone({ type }: IconeProps) {

  // Recherche
  if (type === "search") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
        />

        <path d="m20 20-4-4" />
      </svg>
    );
  }


  // Mes sorties
  if (type === "calendar") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
        />

        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }


  // Créer
  if (type === "plus") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }


  // Messages
  if (type === "message") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.5A8.5 8.5 0 1 1 21 11.5Z" />

        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </svg>
    );
  }


  // Profil
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21c1-5 4-7 8-7s7 2 8 7" />
    </svg>
  );
}


// ------------------------------------------------
// NAVIGATION PRINCIPALE
// ------------------------------------------------

export default function NavigationPrincipale() {
  const pathname = usePathname();

  const estPageAuth =
    pathname.startsWith("/auth");


  // ------------------------------------------------
  // MESSAGES NON LUS
  // ------------------------------------------------

  const [
    nombreMessagesNonLus,
    setNombreMessagesNonLus,
  ] = useState(0);


  const chargerMessagesNonLus =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase.rpc(
        "nombre_messages_non_lus"
      );

      if (error) {
        console.error(
          "Erreur compteur messages :",
          {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        );

        return;
      }

      setNombreMessagesNonLus(
        Number(data ?? 0)
      );
    }, []);

  // ------------------------------------------------
  // ACTUALISATION DU COMPTEUR
  // LORS D'UN CHANGEMENT DE PAGE
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    chargerMessagesNonLus();

  }, [
    pathname,
    estPageAuth,
    chargerMessagesNonLus,
  ]);

  // ------------------------------------------------
  // ÉVÉNEMENT INTERNE :
  // DES MESSAGES VIENNENT D'ÊTRE LUS
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }


    function actualiserCompteur() {
      chargerMessagesNonLus();
    }


    window.addEventListener(
      "messages-non-lus-modifies",
      actualiserCompteur
    );


    return () => {
      window.removeEventListener(
        "messages-non-lus-modifies",
        actualiserCompteur
      );
    };

  }, [
    estPageAuth,
    chargerMessagesNonLus,
  ]);


  // ------------------------------------------------
  // REALTIME :
  // NOUVEAUX MESSAGES ET MESSAGES LUS
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }


    const supabase =
      createClient();


    const channel = supabase
      .channel(
        "navigation-messages-global"
      )

      // Nouveau message
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          chargerMessagesNonLus();
        }
      )

      // Message marqué comme lu
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          chargerMessagesNonLus();
        }
      )

      .subscribe();


    return () => {
      supabase.removeChannel(
        channel
      );
    };

  }, [
    estPageAuth,
    chargerMessagesNonLus,
  ]);

  // ------------------------------------------------
  // PAS DE MENU SUR LES PAGES AUTH
  // IMPORTANT : APRÈS TOUS LES HOOKS
  // ------------------------------------------------

  if (estPageAuth) {
    return null;
  }

  // ------------------------------------------------
  // LIEN ACTIF
  // ------------------------------------------------

  function estActif(href: string) {
    if (href === "/sorties") {
      return (
        pathname === "/sorties" ||
        (
          pathname.startsWith(
            "/sorties/"
          ) &&
          !pathname.startsWith(
            "/sorties/nouvelle"
          ) &&
          !pathname.includes(
            "/modifier"
          )
        )
      );
    }


    if (href === "/mes-sorties") {
      return (
        pathname === "/mes-sorties" ||
        pathname.includes(
          "/modifier"
        )
      );
    }


    if (
      href ===
      "/sorties/nouvelle"
    ) {
      return (
        pathname ===
        "/sorties/nouvelle"
      );
    }


    if (href === "/messages") {
      return pathname.startsWith(
        "/messages"
      );
    }


    if (href === "/profil") {
      return pathname === "/profil";
    }


    return pathname === href;
  }


  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        border-t bg-background

        md:sticky
        md:top-0
        md:bottom-auto
        md:border-b
        md:border-t-0
      "
    >
      <div
        className="
          mx-auto flex h-16 max-w-5xl
          items-center justify-between
          px-2

          md:px-6
        "
      >

        {/* Logo uniquement sur ordinateur */}

        <Link
          href="/sorties"
          className="
            hidden text-xl font-bold
            md:block
          "
        >
          runIN
        </Link>


        {/* Liens */}

        <div
          className="
            flex w-full items-center

            md:w-auto
            md:justify-end
            md:gap-2
          "
        >
          {liens.map((lien) => {
            const actif =
              estActif(lien.href);


            return (
              <Link
                key={lien.href}
                href={lien.href}

                aria-current={
                  actif
                    ? "page"
                    : undefined
                }

                className={`
                  flex min-w-0 flex-1
                  flex-col items-center
                  justify-center gap-1

                  rounded
                  px-1 py-1

                  text-xs
                  transition

                  md:flex-none
                  md:min-w-0
                  md:flex-row
                  md:gap-2
                  md:px-3
                  md:py-2
                  md:text-sm

                  ${
                    lien.principal
                      ? "bg-[#8ED8B6] text-black"

                      : actif
                        ? "text-[#8ED8B6]"

                        : "text-foreground hover:bg-gray-500/10"
                  }
                `}
              >

                {/* ICÔNE + BADGE MESSAGES */}

                <div className="relative">

                  <Icone
                    type={lien.icone}
                  />


                  {lien.href ===
                    "/messages" &&
                    nombreMessagesNonLus >
                      0 && (

                      <span
                        className="
                          absolute
                          -right-3
                          -top-2

                          flex
                          min-h-4
                          min-w-4
                          items-center
                          justify-center

                          rounded-full
                          bg-[#8ED8B6]

                          px-1

                          text-[10px]
                          font-bold
                          text-black
                        "
                      >
                        {nombreMessagesNonLus >
                        99
                          ? "99+"
                          : nombreMessagesNonLus}
                      </span>
                    )}

                </div>


                <span>
                  {lien.label}
                </span>

              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}