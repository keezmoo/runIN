"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import MenuProfil from "./menu-profil";

// ------------------------------------------------
// TYPES
// ------------------------------------------------

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
        <circle cx="11" cy="11" r="7" />

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
        <rect x="3" y="5" width="18" height="16" rx="2" />

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
        <path
          d="
            M21 11.5
            a8.4 8.4 0 0 1-9 8.5
            9.5 9.5 0 0 1-4-.9
            L3 21
            l1.7-4.5
            A8.5 8.5 0 1 1
            21 11.5Z
          "
        />

        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </svg>
    );
  }

  // Notifications
  if (type === "bell") {
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
        <path
          d="
            M18 8
            a6 6 0 0 0-12 0
            c0 7-3 7-3 9
            h18
            c0-2-3-2-3-9
          "
        />

        <path d="M10 21h4" />
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
      <circle cx="12" cy="8" r="4" />

      <path
        d="
          M4 21
          c1-5 4-7 8-7
          s7 2 8 7
        "
      />
    </svg>
  );
}

// ------------------------------------------------
// BADGE
// ------------------------------------------------

function Badge({ nombre }: { nombre: number }) {
  if (nombre <= 0) {
    return null;
  }

  return (
    <span
      className="
        absolute
        -right-2
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
      {nombre > 99 ? "99+" : nombre}
    </span>
  );
}

// ------------------------------------------------
// NAVIGATION PRINCIPALE
// ------------------------------------------------

export default function NavigationPrincipale() {
  const pathname = usePathname();

  const estPageAuth = pathname.startsWith("/auth") || pathname === "/sanction";

  // ------------------------------------------------
  // COMPTEURS
  // ------------------------------------------------

  const [nombreMessagesNonLus, setNombreMessagesNonLus] = useState(0);

  const [nombreNotificationsNonLues, setNombreNotificationsNonLues] =
    useState(0);

  // ------------------------------------------------
  // CHARGEMENT MESSAGES NON LUS
  // ------------------------------------------------

  const chargerMessagesNonLus = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "nombre_messages_non_lus_visibles",
    );

    if (error) {
      console.error("Erreur compteur messages :", {
        message: error.message,

        code: error.code,

        details: error.details,

        hint: error.hint,
      });

      return;
    }

    setNombreMessagesNonLus(Number(data ?? 0));
  }, []);

  // ------------------------------------------------
  // CHARGEMENT NOTIFICATIONS NON LUES
  // ------------------------------------------------

  const chargerNotificationsNonLues = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "nombre_notifications_non_lues_visibles",
    );

    if (error) {
      console.error("Erreur compteur notifications :", error);

      return;
    }

    setNombreNotificationsNonLues(Number(data ?? 0));
  }, []);

  // ------------------------------------------------
  // ACTUALISATION AU CHANGEMENT DE PAGE
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    chargerMessagesNonLus();
    chargerNotificationsNonLues();
  }, [
    pathname,
    estPageAuth,
    chargerMessagesNonLus,
    chargerNotificationsNonLues,
  ]);

  // ------------------------------------------------
  // ÉVÉNEMENT INTERNE NOTIFICATIONS
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    function actualiserNotifications() {
      chargerNotificationsNonLues();
    }

    window.addEventListener(
      "notifications-non-lues-modifiees",
      actualiserNotifications,
    );

    return () => {
      window.removeEventListener(
        "notifications-non-lues-modifiees",
        actualiserNotifications,
      );
    };
  }, [estPageAuth, chargerNotificationsNonLues]);

  // ------------------------------------------------
  // ÉVÉNEMENT INTERNE MESSAGES
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    function actualiserCompteur() {
      chargerMessagesNonLus();
    }

    window.addEventListener("messages-non-lus-modifies", actualiserCompteur);

    return () => {
      window.removeEventListener(
        "messages-non-lus-modifies",
        actualiserCompteur,
      );
    };
  }, [estPageAuth, chargerMessagesNonLus]);

  // ------------------------------------------------
  // REALTIME MESSAGES
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel("navigation-messages-global")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          chargerMessagesNonLus();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          chargerMessagesNonLus();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estPageAuth, chargerMessagesNonLus]);

  // ------------------------------------------------
  // REALTIME NOTIFICATIONS
  // ------------------------------------------------

  useEffect(() => {
    if (estPageAuth) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel("navigation-notifications-global")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          chargerNotificationsNonLues();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        () => {
          chargerNotificationsNonLues();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estPageAuth, chargerNotificationsNonLues]);

  // ------------------------------------------------
  // PAS DE NAVIGATION SUR AUTH
  // IMPORTANT :
  // APRÈS TOUS LES HOOKS
  // ------------------------------------------------

  if (estPageAuth) {
    return null;
  }

  // ------------------------------------------------
  // LIENS ACTIFS
  // ------------------------------------------------

  const sortiesActif =
    pathname === "/sorties" ||
    (pathname.startsWith("/sorties/") &&
      !pathname.startsWith("/sorties/nouvelle") &&
      !pathname.includes("/modifier"));

  const mesSortiesActif =
    pathname === "/mes-sorties" || pathname.includes("/modifier");

  const creerActif = pathname === "/sorties/nouvelle";

  const messagesActif = pathname.startsWith("/messages");

  const notificationsActif = pathname.startsWith("/notifications");

  const profilActif =
    pathname === "/profil" || pathname.startsWith("/parametres");

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <>
      {/* ============================================ */}
      {/* MOBILE : BARRE DU HAUT                     */}
      {/* ============================================ */}

      <header
        className="
          sticky
          top-0
          z-40

          border-b
          border-zinc-800
          bg-background

          md:hidden
        "
      >
        <div
          className="
            mx-auto
            flex
            h-14
            max-w-5xl
            items-center
            justify-between
            px-4
          "
        >
          {/* LOGO */}

          <Link
            href="/sorties"
            className="
              text-xl
              font-bold
            "
          >
            runIN
          </Link>

          {/* ACTIONS HAUTES */}

          <div
            className="
              flex
              items-center
              gap-1
            "
          >
            {/* MESSAGES */}

            <Link
              href="/messages"
              aria-label="Messages"
              aria-current={messagesActif ? "page" : undefined}
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition

                ${
                  messagesActif
                    ? "text-[#8ED8B6]"
                    : "text-foreground hover:bg-zinc-800"
                }
              `}
            >
              <div className="relative">
                <Icone type="message" />

                <Badge nombre={nombreMessagesNonLus} />
              </div>
            </Link>

            {/* NOTIFICATIONS */}

            <Link
              href="/notifications"
              aria-label="Alertes"
              aria-current={notificationsActif ? "page" : undefined}
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition

                ${
                  notificationsActif
                    ? "text-[#8ED8B6]"
                    : "text-foreground hover:bg-zinc-800"
                }
              `}
            >
              <div className="relative">
                <Icone type="bell" />

                <Badge nombre={nombreNotificationsNonLues} />
              </div>
            </Link>

            {/* PROFIL */}

            <MenuProfil actif={profilActif} />
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* MOBILE : BARRE DU BAS                      */}
      {/* ============================================ */}

      <nav
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50

          border-t
          border-zinc-800
          bg-background

          md:hidden
        "
      >
        <div
          className="
            mx-auto
            flex
            h-16
            max-w-5xl
            items-center
          "
        >
          {/* SORTIES */}

          <Link
            href="/sorties"
            aria-current={sortiesActif ? "page" : undefined}
            className={`
              flex
              h-full
              flex-1
              flex-col
              items-center
              justify-center
              gap-1
              text-xs
              transition

              ${sortiesActif ? "text-[#8ED8B6]" : "text-foreground"}
            `}
          >
            <Icone type="search" />

            <span>Sorties</span>
          </Link>

          {/* MES SORTIES */}

          <Link
            href="/mes-sorties"
            aria-current={mesSortiesActif ? "page" : undefined}
            className={`
              flex
              h-full
              flex-1
              flex-col
              items-center
              justify-center
              gap-1
              text-xs
              transition

              ${mesSortiesActif ? "text-[#8ED8B6]" : "text-foreground"}
            `}
          >
            <Icone type="calendar" />

            <span>Mes sorties</span>
          </Link>

          {/* CRÉER */}

          <Link
            href="/sorties/nouvelle"
            aria-current={creerActif ? "page" : undefined}
            className="
              flex
              h-full
              flex-1
              flex-col
              items-center
              justify-center
              gap-1
              text-xs
              font-medium
              text-[#8ED8B6]
            "
          >
            <div
              className={`
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                border

                ${
                  creerActif
                    ? "border-[#8ED8B6] bg-[#8ED8B6] text-black"
                    : "border-[#8ED8B6]"
                }
              `}
            >
              <Icone type="plus" />
            </div>

            <span>Créer</span>
          </Link>
        </div>
      </nav>

      {/* ============================================ */}
      {/* ORDINATEUR                                  */}
      {/* ============================================ */}

      <nav
        className="
          sticky
          top-0
          z-50

          hidden
          border-b
          border-zinc-800
          bg-background

          md:block
        "
      >
        <div
          className="
            mx-auto
            flex
            h-16
            max-w-5xl
            items-center
            justify-between
            px-6
          "
        >
          {/* GAUCHE */}

          <div
            className="
              flex
              items-center
              gap-4
            "
          >
            <Link
              href="/sorties"
              className="
                mr-3
                text-xl
                font-bold
              "
            >
              runIN
            </Link>

            <Link
              href="/sorties"
              className={`
                rounded-lg
                px-3
                py-2
                text-sm
                transition

                ${sortiesActif ? "text-[#8ED8B6]" : "hover:bg-zinc-800"}
              `}
            >
              Sorties
            </Link>

            <Link
              href="/mes-sorties"
              className={`
                rounded-lg
                px-3
                py-2
                text-sm
                transition

                ${mesSortiesActif ? "text-[#8ED8B6]" : "hover:bg-zinc-800"}
              `}
            >
              Mes sorties
            </Link>

            <Link
              href="/sorties/nouvelle"
              className="
                flex
                items-center
                gap-2
                rounded-lg
                bg-[#8ED8B6]
                px-3
                py-2
                text-sm
                font-medium
                text-black
              "
            >
              <Icone type="plus" />
              Créer
            </Link>
          </div>

          {/* DROITE */}

          <div
            className="
              flex
              items-center
              gap-1
            "
          >
            <Link
              href="/messages"
              aria-label="Messages"
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition

                ${messagesActif ? "text-[#8ED8B6]" : "hover:bg-zinc-800"}
              `}
            >
              <div className="relative">
                <Icone type="message" />

                <Badge nombre={nombreMessagesNonLus} />
              </div>
            </Link>

            <Link
              href="/notifications"
              aria-label="Alertes"
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition

                ${notificationsActif ? "text-[#8ED8B6]" : "hover:bg-zinc-800"}
              `}
            >
              <div className="relative">
                <Icone type="bell" />

                <Badge nombre={nombreNotificationsNonLues} />
              </div>
            </Link>

            <MenuProfil actif={profilActif} />
          </div>
        </div>
      </nav>
    </>
  );
}
