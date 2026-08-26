"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

type SortieCarte = {
  id: string;
  titre: string;
  lieu_depart: string;
  type_sortie: string;
  date_heure_depart: string;
  latitude: number;
  longitude: number;
};

type CarteSortiesProps = {
  sorties: SortieCarte[];
  centreLatitude: number;
  centreLongitude: number;
  rayonKm: number;
};

export default function CarteSorties({
  sorties,
  centreLatitude,
  centreLongitude,
  rayonKm,
}: CarteSortiesProps) {
  const [ouverte, setOuverte] = useState(false);

  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!ouverte) {
      return;
    }

    let annule = false;

    async function initialiser() {
      const L = await import("leaflet");

      if (annule || !conteneurRef.current || carteRef.current) {
        return;
      }

      const carte = L.map(conteneurRef.current, {
        scrollWheelZoom: false,
      });

      carteRef.current = carte;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(carte);

      L.circle([centreLatitude, centreLongitude], {
        radius: rayonKm * 1000,
        weight: 1,
        fillOpacity: 0.04,
      }).addTo(carte);

      for (const sortie of sorties) {
        const point = L.circleMarker([sortie.latitude, sortie.longitude], {
          radius: 7,
        }).addTo(carte);

        const contenu = document.createElement("div");

        const titre = document.createElement("strong");
        titre.textContent = sortie.titre;

        const lieu = document.createElement("div");
        lieu.textContent = sortie.lieu_depart;

        const infos = document.createElement("div");
        infos.textContent = `${
          sortie.type_sortie === "trail" ? "Trail" : "Route"
        } · ${new Date(sortie.date_heure_depart).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })}`;

        const lien = document.createElement("a");
        lien.href = `/sorties/${sortie.id}`;
        lien.textContent = "Voir la sortie";
        lien.style.display = "inline-block";
        lien.style.marginTop = "6px";

        contenu.appendChild(titre);
        contenu.appendChild(document.createElement("br"));
        contenu.appendChild(lieu);
        contenu.appendChild(infos);
        contenu.appendChild(lien);

        point.bindPopup(contenu);
      }

      const boundsRecherche = L.latLng(
        centreLatitude,
        centreLongitude,
      ).toBounds(rayonKm * 2000);

      carte.fitBounds(boundsRecherche, {
        padding: [15, 15],
      });
    }

    void initialiser();

    return () => {
      annule = true;

      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
      }
    };
  }, [ouverte, sorties, centreLatitude, centreLongitude, rayonKm]);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOuverte((valeur) => !valeur)}
        className="
          rounded
          border
          px-4
          py-2
          text-sm
          font-medium
          hover:bg-gray-50
        "
      >
        {ouverte ? "Masquer la carte" : "Voir sur la carte"}
      </button>

      {ouverte && (
        <div
          ref={conteneurRef}
          className="
            mt-3
            h-72
            w-full
            overflow-hidden
            rounded
            border
          "
        />
      )}
    </div>
  );
}
