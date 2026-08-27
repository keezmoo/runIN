"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type Localisation = {
  latitude: number;
  longitude: number;
};

type SelecteurLieuProps = {
  lieu: string;
  onLieuChange: (lieu: string) => void;
  localisation: Localisation | null;
  onLocalisationChange: (localisation: Localisation | null) => void;
};

export default function SelecteurLieu({
  lieu,
  onLieuChange,
  localisation,
  onLocalisationChange,
}: SelecteurLieuProps) {
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [nomTrouve, setNomTrouve] = useState("");

  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<LeafletMap | null>(null);
  const marqueurRef = useRef<LeafletMarker | null>(null);

  // ------------------------------------------------
  // CARTE
  // ------------------------------------------------

  async function actualiserLieuDepuisCoordonnees(
    nouvelleLocalisation: Localisation,
  ) {
    try {
      const response = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(
          nouvelleLocalisation.latitude,
        )}&lon=${encodeURIComponent(nouvelleLocalisation.longitude)}`,
      );

      const resultat = (await response.json()) as {
        nom?: string;
        error?: string;
      };

      if (!response.ok || !resultat.nom) {
        setMessage(
          resultat.error ??
            "Impossible de déterminer le lieu correspondant à cette position.",
        );

        return;
      }

      onLieuChange(resultat.nom);
      setNomTrouve(resultat.nom);
      setMessage("");
    } catch {
      setMessage("Impossible de mettre à jour le nom du lieu.");
    }
  }

  useEffect(() => {
    let annule = false;

    async function synchroniserCarte() {
      if (!localisation) {
        if (carteRef.current) {
          carteRef.current.remove();
          carteRef.current = null;
          marqueurRef.current = null;
        }

        return;
      }

      const L = await import("leaflet");

      if (annule || !conteneurRef.current) {
        return;
      }

      // Carte déjà créée : on déplace simplement le point.
      if (carteRef.current && marqueurRef.current) {
        carteRef.current.setView(
          [localisation.latitude, localisation.longitude],
          carteRef.current.getZoom(),
        );

        marqueurRef.current.setLatLng([
          localisation.latitude,
          localisation.longitude,
        ]);

        carteRef.current.invalidateSize();

        return;
      }

      const carte = L.map(conteneurRef.current, {
        scrollWheelZoom: false,
      }).setView([localisation.latitude, localisation.longitude], 16);

      carteRef.current = carte;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(carte);

      // Icône personnalisée :
      // évite les problèmes d'images des marqueurs Leaflet avec Next.js.
      const icone = L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background: #111;
              border: 4px solid white;
              box-shadow: 0 1px 5px rgba(0,0,0,0.4);
            "
          ></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marqueur = L.marker(
        [localisation.latitude, localisation.longitude],
        {
          draggable: true,
          icon: icone,
        },
      ).addTo(carte);

      marqueurRef.current = marqueur;

      // Déplacement du marqueur.
      marqueur.on("dragend", () => {
        const position = marqueur.getLatLng();

        const nouvelleLocalisation = {
          latitude: position.lat,
          longitude: position.lng,
        };

        onLocalisationChange(nouvelleLocalisation);

        void actualiserLieuDepuisCoordonnees(nouvelleLocalisation);
      });

      // Clic directement sur la carte.
      carte.on("click", (evenement) => {
        marqueur.setLatLng(evenement.latlng);

        const nouvelleLocalisation = {
          latitude: evenement.latlng.lat,
          longitude: evenement.latlng.lng,
        };

        onLocalisationChange(nouvelleLocalisation);

        void actualiserLieuDepuisCoordonnees(nouvelleLocalisation);
      });

      requestAnimationFrame(() => {
        carte.invalidateSize();
      });
    }

    void synchroniserCarte();

    return () => {
      annule = true;
    };
  }, [localisation, onLocalisationChange]);

  useEffect(() => {
    return () => {
      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
        marqueurRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------
  // GÉOCODAGE
  // ------------------------------------------------

  async function localiser() {
    const recherche = lieu.trim();

    setMessage("");
    setNomTrouve("");

    if (recherche.length < 2) {
      setMessage("Indiquez d'abord un lieu.");
      return;
    }

    setRechercheEnCours(true);

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(recherche)}`,
      );

      const resultat = (await response.json()) as {
        nom?: string;
        latitude?: number;
        longitude?: number;
        error?: string;
      };

      if (!response.ok) {
        setMessage(resultat.error ?? "Impossible de trouver ce lieu.");

        onLocalisationChange(null);

        return;
      }

      const latitude = Number(resultat.latitude);
      const longitude = Number(resultat.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setMessage("Les coordonnées retournées sont invalides.");
        onLocalisationChange(null);
        return;
      }

      onLocalisationChange({
        latitude,
        longitude,
      });

      setNomTrouve(resultat.nom ?? recherche);
    } catch {
      setMessage("Impossible de contacter le service de localisation.");
      onLocalisationChange(null);
    } finally {
      setRechercheEnCours(false);
    }
  }

  function modifierLieu(valeur: string) {
    onLieuChange(valeur);

    // Le texte ne correspond plus forcément au point précédent.
    // On oblige donc à relocaliser.
    onLocalisationChange(null);

    setNomTrouve("");
    setMessage("");
  }

  return (
    <div>
      <label className="mb-1 block font-medium">Lieu de départ</label>

      <div className="flex gap-2">
        <input
          type="text"
          value={lieu}
          onChange={(e) => modifierLieu(e.target.value)}
          className="min-w-0 flex-1 rounded border p-2"
          placeholder="Parking du Nivolet, Chambéry"
        />

        <button
          type="button"
          onClick={localiser}
          disabled={rechercheEnCours}
          className="
            shrink-0
            rounded
            border
            px-4
            py-2
            text-sm
            font-medium
            hover:bg-gray-50
            disabled:opacity-50
          "
        >
          {rechercheEnCours ? "Recherche..." : "Localiser"}
        </button>
      </div>

      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

      {nomTrouve && (
        <p className="mt-2 text-xs text-gray-500">
          Localisation trouvée : {nomTrouve}
        </p>
      )}

      {localisation && (
        <>
          <div
            ref={conteneurRef}
            className="
              mt-3
              h-64
              w-full
              overflow-hidden
              rounded
              border
            "
          />

          <p className="mt-2 text-xs text-gray-500">
            Cliquez sur la carte ou déplacez le point pour préciser le lieu
            exact du rendez-vous.
          </p>
        </>
      )}
    </div>
  );
}
