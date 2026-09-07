"use client";

import { useState } from "react";
import type { ComponentProps } from "react";

import FiltresSorties from "./filtres-sorties";
import CarteSorties from "./carte-sorties";

type PanneauOuvert = "filtres" | "carte" | null;

type Props = {
  filtres: ComponentProps<typeof FiltresSorties>;
  carte: ComponentProps<typeof CarteSorties>;
};

export default function OutilsRechercheSorties({ filtres, carte }: Props) {
  const [panneauOuvert, setPanneauOuvert] = useState<PanneauOuvert>(null);

  function basculer(panneau: Exclude<PanneauOuvert, null>) {
    setPanneauOuvert((actuel) => (actuel === panneau ? null : panneau));
  }

  return (
    <div className="mb-4">
      {/* BOUTONS */}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => basculer("filtres")}
          aria-expanded={panneauOuvert === "filtres"}
          className="
            flex
            items-center
            justify-between
            rounded-xl
            border
            px-4
            py-3
            text-left
            text-sm
            font-medium
            transition
            hover:bg-foreground/5
          "
        >
          <span>Filtres</span>

          <span
            className={`
              transition-transform
              ${panneauOuvert === "filtres" ? "rotate-90" : ""}
            `}
          >
            &gt;
          </span>
        </button>

        <button
          type="button"
          onClick={() => basculer("carte")}
          aria-expanded={panneauOuvert === "carte"}
          className="
            flex
            items-center
            justify-between
            rounded-xl
            border
            px-4
            py-3
            text-left
            text-sm
            font-medium
            transition
            hover:bg-foreground/5
          "
        >
          <span>Carte</span>

          <span
            className={`
              transition-transform
              ${panneauOuvert === "carte" ? "rotate-90" : ""}
            `}
          >
            &gt;
          </span>
        </button>
      </div>

      {/* FILTRES */}

      {panneauOuvert === "filtres" && (
        <div className="mt-2 rounded-xl border p-4">
          <FiltresSorties {...filtres} />
        </div>
      )}

      {/* CARTE */}

      {panneauOuvert === "carte" && (
        <div className="mt-2">
          <CarteSorties {...carte} />
        </div>
      )}
    </div>
  );
}
