"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RayonSlider from "./rayon-slider";

type FiltresSortiesProps = {
  lieuActuel: string;
  rayonActuel: number;
  typeActuel: string;
  dateActuelle: string;
};

export default function FiltresSorties({
  lieuActuel,
  rayonActuel,
  typeActuel,
  dateActuelle,
}: FiltresSortiesProps) {
  const router = useRouter();

  const [lieu, setLieu] = useState(lieuActuel);
  const [rayon, setRayon] = useState(
    rayonActuel
  );
  const [type, setType] = useState(typeActuel);
  const [date, setDate] = useState(dateActuelle);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function rechercher() {
    setMessage("");

    if (lieu.trim().length < 2) {
      setMessage("Veuillez indiquer un lieu.");
      return;
    }

    setLoading(true);

    // Transforme "Grenoble" en coordonnées
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(
        lieu.trim()
      )}`
    );

    if (!response.ok) {
      setMessage(
        "Impossible de trouver cette localisation."
      );
      setLoading(false);
      return;
    }

    const localisation = await response.json();

    // Construction des paramètres de l'URL
    const params = new URLSearchParams();

    params.set("lieu", lieu.trim());
    params.set("rayon", rayon.toString());

    params.set(
      "lat",
      localisation.latitude.toString()
    );

    params.set(
      "lon",
      localisation.longitude.toString()
    );

    if (type) {
      params.set("type", type);
    }

    if (date) {
      params.set("date", date);
    }

    router.push(
      `/sorties?${params.toString()}`
    );

    setLoading(false);
  }

  return (
    <div className="mb-8 space-y-4 rounded border p-4">

      <h2 className="font-semibold">
        Rechercher une sortie
      </h2>


      {/* LIEU */}

      <div>
        <label className="mb-1 block">
          Lieu
        </label>

        <input
          type="text"
          value={lieu}
          onChange={(e) => setLieu(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Chambéry"
        />
      </div>


      {/* RAYON */}

      <RayonSlider
        value={rayon}
        onChange={setRayon}
      />


      {/* TYPE */}

      <div>
        <label className="mb-1 block">
          Type de sortie
        </label>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="">Tous</option>
          <option value="route">Route</option>
          <option value="trail">Trail</option>
        </select>
      </div>


      {/* DATE */}

      <div>
        <label className="mb-1 block">
          Date à partir de
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border p-2"
        />
      </div>


      {/* BOUTONS */}

      <div className="flex gap-3">

        <button
          type="button"
          onClick={rechercher}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
        >
          {loading
            ? "Recherche..."
            : "Rechercher"}
        </button>

        <Link
          href="/sorties"
          className="rounded border px-4 py-2"
        >
          Réinitialiser
        </Link>

      </div>


      {message && (
        <p className="text-sm">
          {message}
        </p>
      )}

    </div>
  );
}