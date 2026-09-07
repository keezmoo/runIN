"use client";

import { useEffect, useRef } from "react";

import type { Circle, Map as LeafletMap, Marker } from "leaflet";

type Props = {
  latitude: number;
  longitude: number;
  rayonKm: number;

  onCentreChange: (latitude: number, longitude: number) => void;
};

export default function CarteZoneRecherche({
  latitude,
  longitude,
  rayonKm,
  onCentreChange,
}: Props) {
  const conteneurRef = useRef<HTMLDivElement | null>(null);

  const carteRef = useRef<LeafletMap | null>(null);

  const marqueurRef = useRef<Marker | null>(null);

  const cercleRef = useRef<Circle | null>(null);

  const onCentreChangeRef = useRef(onCentreChange);

  // ------------------------------------------------
  // GARDE LE CALLBACK A JOUR
  // ------------------------------------------------

  useEffect(() => {
    onCentreChangeRef.current = onCentreChange;
  }, [onCentreChange]);

  // ------------------------------------------------
  // CREATION DE LA CARTE
  // ------------------------------------------------

  useEffect(() => {
    let annule = false;

    async function initialiser() {
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(rayonKm)
      ) {
        return;
      }

      const L = await import("leaflet");

      if (annule || !conteneurRef.current || carteRef.current) {
        return;
      }

      // IMPORTANT :
      // la carte reçoit immédiatement un centre
      // et un niveau de zoom valides.
      const carte = L.map(conteneurRef.current, {
        scrollWheelZoom: false,
      }).setView([latitude, longitude], 12);

      carteRef.current = carte;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(carte);

      // ------------------------------------------------
      // MARQUEUR
      // ------------------------------------------------

      const icone = L.divIcon({
        className: "",
        html: `
          <div
            style="
              width: 20px;
              height: 20px;
              border-radius: 9999px;
              background: #111;
              border: 4px solid white;
              box-shadow: 0 1px 5px rgba(0,0,0,0.45);
            "
          ></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marqueur = L.marker([latitude, longitude], {
        draggable: true,
        icon: icone,
      }).addTo(carte);

      marqueurRef.current = marqueur;

      // ------------------------------------------------
      // CERCLE DE RECHERCHE
      // ------------------------------------------------

      const cercle = L.circle([latitude, longitude], {
        radius: rayonKm * 1000,
        weight: 2,
        fillOpacity: 0.08,
      }).addTo(carte);

      cercleRef.current = cercle;

      // ------------------------------------------------
      // DEPLACEMENT DU MARQUEUR
      // ------------------------------------------------

      marqueur.on("dragend", () => {
        const position = marqueur.getLatLng();

        cercle.setLatLng(position);

        onCentreChangeRef.current(position.lat, position.lng);
      });

      // ------------------------------------------------
      // CLIC SUR LA CARTE
      // ------------------------------------------------

      carte.on("click", (evenement) => {
        marqueur.setLatLng(evenement.latlng);

        cercle.setLatLng(evenement.latlng);

        onCentreChangeRef.current(evenement.latlng.lat, evenement.latlng.lng);
      });

      // ------------------------------------------------
      // CADRAGE SUR LE RAYON
      // ------------------------------------------------

      const boundsRecherche = L.latLng(latitude, longitude).toBounds(
        rayonKm * 2000,
      );

      carte.fitBounds(boundsRecherche, {
        padding: [20, 20],
      });

      requestAnimationFrame(() => {
        carte.invalidateSize();
      });
    }

    void initialiser();

    return () => {
      annule = true;

      if (carteRef.current) {
        carteRef.current.remove();

        carteRef.current = null;
        marqueurRef.current = null;
        cercleRef.current = null;
      }
    };

    // Création uniquement au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------
  // MISE A JOUR CENTRE + RAYON
  // ------------------------------------------------

  useEffect(() => {
    async function synchroniser() {
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(rayonKm)
      ) {
        return;
      }

      const carte = carteRef.current;

      const marqueur = marqueurRef.current;

      const cercle = cercleRef.current;

      if (!carte || !marqueur || !cercle) {
        return;
      }

      const L = await import("leaflet");

      const position: [number, number] = [latitude, longitude];

      marqueur.setLatLng(position);

      cercle.setLatLng(position);

      cercle.setRadius(rayonKm * 1000);

      // On recalcule le cadrage directement
      // à partir du centre et du rayon.
      const boundsRecherche = L.latLng(latitude, longitude).toBounds(
        rayonKm * 2000,
      );

      carte.fitBounds(boundsRecherche, {
        padding: [20, 20],
      });

      requestAnimationFrame(() => {
        carte.invalidateSize();
      });
    }

    void synchroniser();
  }, [latitude, longitude, rayonKm]);

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <div
      ref={conteneurRef}
      className="
        h-56
        w-full
        overflow-hidden
        rounded-lg
        border
        sm:h-64
      "
    />
  );
}
