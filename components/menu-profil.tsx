"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";


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
      <circle
        cx="12"
        cy="8"
        r="4"
      />

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


export default function MenuProfil({
  actif = false,
}: MenuProfilProps) {

  const pathname =
    usePathname();


  const [
    ouvert,
    setOuvert,
  ] = useState(false);


  const conteneurRef =
    useRef<HTMLDivElement>(
      null
    );


  // Fermer le menu
  // lorsqu'on change de page
  useEffect(() => {

    setOuvert(false);

  }, [pathname]);


  // Fermer si clic
  // en dehors du menu
  useEffect(() => {

    function fermerSiClicExterieur(
      event: MouseEvent
    ) {

      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(
          event.target as Node
        )
      ) {

        setOuvert(false);

      }

    }


    if (ouvert) {

      document.addEventListener(
        "mousedown",
        fermerSiClicExterieur
      );

    }


    return () => {

      document.removeEventListener(
        "mousedown",
        fermerSiClicExterieur
      );

    };

  }, [ouvert]);


  // Fermer avec Échap
  useEffect(() => {

    function fermerAvecEchap(
      event: KeyboardEvent
    ) {

      if (
        event.key === "Escape"
      ) {

        setOuvert(false);

      }

    }


    document.addEventListener(
      "keydown",
      fermerAvecEchap
    );


    return () => {

      document.removeEventListener(
        "keydown",
        fermerAvecEchap
      );

    };

  }, []);


  return (
    <div
      ref={conteneurRef}
      className="relative"
    >

      {/* BOUTON PROFIL */}

      <button
        type="button"
        aria-label="Menu du profil"
        aria-expanded={ouvert}
        onClick={() =>
          setOuvert(
            (valeur) => !valeur
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
              ? "bg-zinc-800 text-[#8ED8B6]"
              : "text-foreground hover:bg-zinc-800"
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
            border-zinc-800
            bg-zinc-900

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

                hover:bg-zinc-800
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

                hover:bg-zinc-800
              "
            >
              Paramètres
            </Link>

          </div>


          <div
            className="
              border-t
              border-zinc-800
              p-1
            "
          >

            <form
              action="/auth/signout"
              method="post"
            >
              <button
                type="submit"
                className="
                  block
                  w-full
                  rounded-lg
                  px-3
                  py-2.5

                  text-left
                  text-sm
                  text-red-400

                  hover:bg-zinc-800
                "
              >
                Déconnexion
              </button>
            </form>

          </div>

        </div>

      )}

    </div>
  );
}