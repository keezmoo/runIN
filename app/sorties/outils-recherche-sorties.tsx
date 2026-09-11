"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          variant="outline"
          onClick={() => basculer("filtres")}
          aria-expanded={panneauOuvert === "filtres"}
          className="h-auto w-full justify-between rounded-xl px-4 py-3"
        >
          <span>Filtres</span>

          <span
            className={`transition-transform ${
              panneauOuvert === "filtres" ? "rotate-90" : ""
            }`}
          >
            &gt;
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => basculer("carte")}
          aria-expanded={panneauOuvert === "carte"}
          className="h-auto w-full justify-between rounded-xl px-4 py-3"
        >
          <span>Carte</span>

          <span
            className={`transition-transform ${
              panneauOuvert === "carte" ? "rotate-90" : ""
            }`}
          >
            &gt;
          </span>
        </Button>
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
