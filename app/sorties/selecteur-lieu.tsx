"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
  Circle,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";

export type Localisation = {
  latitude: number;
  longitude: number;
};

type SelecteurLieuProps = {
  lieu: string;
  onLieuChange: (lieu: string) => void;
  localisation: Localisation | null;
  onLocalisationChange: (localisation: Localisation | null) => void;
  libelle?: string;
  placeholder?: string;
  resumeSupplementaire?: ReactNode;
  contenuSupplementaire?: ReactNode;
  rayonCarteKm?: number;
  aideCarte?: string;
};

export default function SelecteurLieu({
  lieu,
  onLieuChange,
  localisation,
  onLocalisationChange,
  libelle = "Lieu de départ",
  placeholder = "Parking du Nivolet, Chambéry",
  resumeSupplementaire,
  contenuSupplementaire,
  rayonCarteKm,
  aideCarte = "Cliquez sur la carte ou déplacez le point pour préciser le lieu exact.",
}: SelecteurLieuProps) {
  const [ouverte, setOuverte] = useState(false);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [localisationCarte, setLocalisationCarte] =
    useState<Localisation | null>(localisation);

  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const carteRef = useRef<LeafletMap | null>(null);
  const marqueurRef = useRef<LeafletMarker | null>(null);
  const cercleRef = useRef<Circle | null>(null);
  const requeteIdRef = useRef(0);

  const onLieuChangeRef = useRef(onLieuChange);
  const onLocalisationChangeRef = useRef(onLocalisationChange);

  useEffect(() => {
    onLieuChangeRef.current = onLieuChange;
  }, [onLieuChange]);

  useEffect(() => {
    onLocalisationChangeRef.current = onLocalisationChange;
  }, [onLocalisationChange]);

  useEffect(() => {
    if (
      localisation &&
      Number.isFinite(localisation.latitude) &&
      Number.isFinite(localisation.longitude)
    ) {
      // Synchronisation volontaire du brouillon cartographique
      // lorsqu'une nouvelle localisation valide arrive du parent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalisationCarte(localisation);
    }
  }, [localisation]);

  async function reverseGeocoder(nouvelleLocalisation: Localisation) {
    const idRequete = ++requeteIdRef.current;

    onLieuChangeRef.current("Position personnalisée");

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

      if (idRequete !== requeteIdRef.current) {
        return;
      }

      if (!response.ok) {
        console.error("Erreur géocodage inverse :", resultat.error);
        return;
      }

      if (typeof resultat.nom === "string" && resultat.nom.trim()) {
        onLieuChangeRef.current(resultat.nom.trim());
      }
    } catch (erreur) {
      console.error("Erreur géocodage inverse :", erreur);
    }
  }

  function appliquerPosition(nouvelleLocalisation: Localisation) {
    setLocalisationCarte(nouvelleLocalisation);
    onLocalisationChangeRef.current(nouvelleLocalisation);
    setMessage("");

    void reverseGeocoder(nouvelleLocalisation);
  }

  useEffect(() => {
    if (!ouverte || !localisationCarte) {
      return;
    }

    const localisationInitiale = localisationCarte;

    let annule = false;

    async function initialiserCarte() {
      if (
        !Number.isFinite(localisationInitiale.latitude) ||
        !Number.isFinite(localisationInitiale.longitude)
      ) {
        return;
      }

      const L = await import("leaflet");

      if (annule || !conteneurRef.current || carteRef.current) {
        return;
      }

      const carte = L.map(conteneurRef.current, {
        scrollWheelZoom: false,
      }).setView(
        [localisationInitiale.latitude, localisationInitiale.longitude],
        rayonCarteKm === undefined ? 16 : 12,
      );

      carteRef.current = carte;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(carte);

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

      const marqueur = L.marker(
        [localisationInitiale.latitude, localisationInitiale.longitude],
        {
          draggable: true,
          icon: icone,
        },
      ).addTo(carte);

      marqueurRef.current = marqueur;

      if (
        rayonCarteKm !== undefined &&
        Number.isFinite(rayonCarteKm) &&
        rayonCarteKm > 0
      ) {
        cercleRef.current = L.circle(
          [localisationInitiale.latitude, localisationInitiale.longitude],
          {
            radius: rayonCarteKm * 1000,
            weight: 2,
            fillOpacity: 0.08,
          },
        ).addTo(carte);

        const boundsRecherche = L.latLng(
          localisationInitiale.latitude,
          localisationInitiale.longitude,
        ).toBounds(rayonCarteKm * 2000);

        carte.fitBounds(boundsRecherche, {
          padding: [20, 20],
        });
      }

      marqueur.on("dragend", () => {
        const position = marqueur.getLatLng();

        appliquerPosition({
          latitude: position.lat,
          longitude: position.lng,
        });
      });

      carte.on("click", (evenement) => {
        marqueur.setLatLng(evenement.latlng);

        appliquerPosition({
          latitude: evenement.latlng.lat,
          longitude: evenement.latlng.lng,
        });
      });

      requestAnimationFrame(() => {
        carte.invalidateSize();
      });
    }

    void initialiserCarte();

    return () => {
      annule = true;

      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
        marqueurRef.current = null;
        cercleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte]);

  useEffect(() => {
    if (!ouverte || !localisationCarte) {
      return;
    }

    const localisationCourante = localisationCarte;

    async function synchroniserCarte() {
      const carte = carteRef.current;
      const marqueur = marqueurRef.current;

      if (!carte || !marqueur) {
        return;
      }

      const position: [number, number] = [
        localisationCourante.latitude,
        localisationCourante.longitude,
      ];

      marqueur.setLatLng(position);

      const L = await import("leaflet");

      if (
        rayonCarteKm !== undefined &&
        Number.isFinite(rayonCarteKm) &&
        rayonCarteKm > 0
      ) {
        if (!cercleRef.current) {
          cercleRef.current = L.circle(position, {
            radius: rayonCarteKm * 1000,
            weight: 2,
            fillOpacity: 0.08,
          }).addTo(carte);
        } else {
          cercleRef.current.setLatLng(position);
          cercleRef.current.setRadius(rayonCarteKm * 1000);
        }

        const boundsRecherche = L.latLng(
          localisationCourante.latitude,
          localisationCourante.longitude,
        ).toBounds(rayonCarteKm * 2000);

        carte.fitBounds(boundsRecherche, {
          padding: [20, 20],
        });
      } else {
        if (cercleRef.current) {
          cercleRef.current.remove();
          cercleRef.current = null;
        }

        carte.setView(position, carte.getZoom());
      }

      requestAnimationFrame(() => {
        carte.invalidateSize();
      });
    }

    void synchroniserCarte();
  }, [ouverte, localisationCarte, rayonCarteKm]);

  useEffect(() => {
    return () => {
      requeteIdRef.current += 1;

      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
        marqueurRef.current = null;
        cercleRef.current = null;
      }
    };
  }, []);

  function modifierLieu(valeur: string) {
    requeteIdRef.current += 1;

    onLieuChange(valeur);
    onLocalisationChange(null);
    setMessage("");
  }

  async function localiser() {
    const recherche = lieu.trim();

    setMessage("");

    if (recherche.length < 2) {
      setMessage("Indiquez d'abord un lieu.");
      return;
    }

    const idRequete = ++requeteIdRef.current;

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

      if (idRequete !== requeteIdRef.current) {
        return;
      }

      if (!response.ok) {
        setMessage(resultat.error ?? "Impossible de trouver ce lieu.");
        return;
      }

      const latitude = Number(resultat.latitude);
      const longitude = Number(resultat.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setMessage("Les coordonnées retournées sont invalides.");
        return;
      }

      const nouveauNom =
        typeof resultat.nom === "string" && resultat.nom.trim()
          ? resultat.nom.trim()
          : recherche;

      const nouvelleLocalisation = {
        latitude,
        longitude,
      };

      onLieuChange(nouveauNom);
      setLocalisationCarte(nouvelleLocalisation);
      onLocalisationChange(nouvelleLocalisation);
    } catch (erreur) {
      console.error("Erreur localisation :", erreur);
      setMessage("Impossible de contacter le service de localisation.");
    } finally {
      if (idRequete === requeteIdRef.current) {
        setRechercheEnCours(false);
      }
    }
  }

  function validerEtFermer() {
    if (
      !localisation ||
      !Number.isFinite(localisation.latitude) ||
      !Number.isFinite(localisation.longitude)
    ) {
      setMessage("Localisez d'abord le lieu saisi.");
      return;
    }

    setOuverte(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOuverte((valeur) => !valeur)}
        aria-expanded={ouverte}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>

          <span className="truncate font-medium">
            {lieu || "Ajouter une localisation"}
            {resumeSupplementaire}
          </span>
        </div>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-5 w-5 shrink-0 transition-transform ${
            ouverte ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {ouverte && (
        <div className="space-y-4 border-t p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{libelle}</label>

            <div className="flex gap-2">
              <input
                type="text"
                value={lieu}
                onChange={(event) => modifierLieu(event.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 rounded-lg border p-2"
              />

              <button
                type="button"
                onClick={localiser}
                disabled={rechercheEnCours}
                className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {rechercheEnCours ? "Recherche..." : "Localiser"}
              </button>
            </div>

            {!localisation && (
              <p className="mt-2 text-xs text-gray-500">
                Cliquez sur « Localiser » ou choisissez un point sur la carte.
              </p>
            )}

            {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
          </div>

          {contenuSupplementaire}

          <div>
            {localisationCarte ? (
              <div
                ref={conteneurRef}
                className="h-56 w-full overflow-hidden rounded-lg border sm:h-64"
              />
            ) : (
              <div className="rounded-lg border p-4 text-sm text-gray-500">
                Localisez un lieu pour afficher la carte.
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">{aideCarte}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={validerEtFermer}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Valider la localisation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
