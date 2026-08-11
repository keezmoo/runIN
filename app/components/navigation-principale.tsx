"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    href: "/profil",
    label: "Profil",
    icone: "profile",
  },
];

type IconeProps = {
  type: string;
};

function Icone({ type }: IconeProps) {
  if (type === "search") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
        />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }

  if (type === "plus") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-5 4-7 8-7s7 2 8 7" />
    </svg>
  );
}

export default function NavigationPrincipale() {
  const pathname = usePathname();

  // Pas de menu sur les pages de connexion,
  // inscription, mot de passe, etc.
  if (pathname.startsWith("/auth")) {
    return null;
  }

  function estActif(href: string) {
    if (href === "/sorties") {
      return pathname === "/sorties";
    }

    if (href === "/mes-sorties") {
      return (
        pathname === "/mes-sorties" ||
        pathname.includes("/modifier")
      );
    }

    return pathname === href;
  }

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        border-t bg-background
        md:sticky md:top-0 md:bottom-auto
        md:border-b md:border-t-0
      "
    >
      <div
        className="
          mx-auto flex h-16 max-w-5xl
          items-center justify-between
          px-2 md:px-6
        "
      >
        {/* Logo uniquement sur ordinateur */}
        <Link
          href="/sorties"
          className="hidden text-xl font-bold md:block"
        >
          runIN
        </Link>

        {/* Liens */}
        <div
          className="
            flex w-full items-center
            justify-around
            md:w-auto md:justify-end md:gap-2
          "
        >
          {liens.map((lien) => {
            const actif = estActif(lien.href);

            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={
                  actif ? "page" : undefined
                }
                className={`
                  flex min-w-[68px]
                  flex-col items-center
                  justify-center gap-1
                  rounded px-2 py-1
                  text-xs transition
                  md:min-w-0 md:flex-row
                  md:gap-2 md:px-3 md:py-2
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
                <Icone type={lien.icone} />

                <span>{lien.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}