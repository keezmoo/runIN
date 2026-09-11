"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type MenuProfilProps = {
  actif?: boolean;
};

function IconeProfil() {
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

export default function MenuProfil({ actif = false }: MenuProfilProps) {
  const pathname = usePathname();

  const [cheminMenuOuvert, setCheminMenuOuvert] = useState<string | null>(null);

  const ouvert = cheminMenuOuvert === pathname;

  const [estAdministrateur, setEstAdministrateur] = useState(false);

  const [roleCharge, setRoleCharge] = useState(false);

  const conteneurRef = useRef<HTMLDivElement>(null);

  // Fermer si clic
  // en dehors du menu
  useEffect(() => {
    function fermerSiClicExterieur(event: MouseEvent) {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(event.target as Node)
      ) {
        setCheminMenuOuvert(null);
      }
    }

    if (ouvert) {
      document.addEventListener("mousedown", fermerSiClicExterieur);
    }

    return () => {
      document.removeEventListener("mousedown", fermerSiClicExterieur);
    };
  }, [ouvert]);

  // Fermer avec Échap
  useEffect(() => {
    function fermerAvecEchap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCheminMenuOuvert(null);
      }
    }

    document.addEventListener("keydown", fermerAvecEchap);

    return () => {
      document.removeEventListener("keydown", fermerAvecEchap);
    };
  }, []);

  // ------------------------------------------------
  // RÔLE ADMINISTRATEUR
  // Chargé uniquement lorsque le menu est ouvert.
  // ------------------------------------------------

  useEffect(() => {
    if (!ouvert || roleCharge) {
      return;
    }

    let actif = true;

    async function chargerRole() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("mon_role_application");

      if (!actif) {
        return;
      }

      if (!error) {
        setEstAdministrateur(
          data === "administrateur" || data === "moderateur",
        );
      }

      setRoleCharge(true);
    }

    void chargerRole();

    return () => {
      actif = false;
    };
  }, [ouvert, roleCharge]);

  return (
    <div ref={conteneurRef} className="relative">
      {/* BOUTON PROFIL */}

      <button
        type="button"
        aria-label="Menu du profil"
        aria-expanded={ouvert}
        onClick={() =>
          setCheminMenuOuvert((cheminActuel) =>
            cheminActuel === pathname ? null : pathname,
          )
        }
        className={`
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-full
          transition

          ${
            actif || ouvert
              ? "bg-accent text-primary-strong"
              : "text-foreground hover:bg-accent"
          }
        `}
      >
        <IconeProfil />
      </button>

      {/* MENU */}

      {ouvert && (
        <div
          className="
            absolute
            right-0
            top-12
            z-[60]

            w-48

            overflow-hidden
            rounded-xl
            border
            border-border
            bg-popover text-popover-foreground

            shadow-xl
          "
        >
          <div className="p-1">
            <Link
              href="/profil"
              className="
                block
                rounded-lg
                px-3
                py-2.5

                text-sm

                hover:bg-accent
              "
            >
              Mon profil
            </Link>

            <Link
              href="/parametres"
              className="
                block
                rounded-lg
                px-3
                py-2.5

                text-sm

                hover:bg-accent
              "
            >
              Paramètres
            </Link>

            {estAdministrateur && (
              <Link
                href="/admin"
                className="
            block
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-primary-strong
            hover:bg-accent
        "
              >
                Administration
              </Link>
            )}
          </div>

          <div
            className="
              border-t
              border-border
              p-1
            "
          >
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                className="
    h-auto
    w-full
    justify-start
    rounded-lg
    px-3
    py-2.5
    text-sm
    text-destructive
    hover:bg-accent
    hover:text-destructive
  "
              >
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
