"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

type CarteSortieProps = {
  latitude: number;
  longitude: number;
  lieu: string;
};

export default function CarteSortie({
  latitude,
  longitude,
  lieu,
}: CarteSortieProps) {
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let annule = false;

    async function initialiser() {
      const L = await import("leaflet");

      if (annule || !conteneurRef.current || carteRef.current) {
        return;
      }

      const carte = L.map(conteneurRef.current, {
        scrollWheelZoom: false,
      }).setView([latitude, longitude], 15);

      carteRef.current = carte;

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(carte);

      L.circleMarker([latitude, longitude], {
        radius: 8,
      })
        .addTo(carte)
        .bindPopup(lieu);
    }

    void initialiser();

    return () => {
      annule = true;

      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
      }
    };
  }, [latitude, longitude, lieu]);

  return (
    <div
      ref={conteneurRef}
      className="h-64 w-full overflow-hidden rounded border"
    />
  );
}