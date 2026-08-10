"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  nom: string;
  age: number;
  sexe: string;
  lieu_recherche: string | null;
  rayon_recherche_km: number;
  position_recherche: string | null;
} | null;

type ProfileFormProps = {
  userId: string;
  initialProfile: Profile;
};

export default function ProfileForm({
  userId,
  initialProfile,
}: ProfileFormProps) {
  const [nom, setNom] = useState(initialProfile?.nom ?? "");
  const [age, setAge] = useState(
    initialProfile?.age?.toString() ?? ""
  );
  const [sexe, setSexe] = useState(initialProfile?.sexe ?? "homme");
  const [lieuRecherche, setLieuRecherche] = useState(
    initialProfile?.lieu_recherche ?? ""
  );

  const [rayonRecherche, setRayonRecherche] = useState(
    initialProfile?.rayon_recherche_km?.toString() ?? "20"
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function enregistrerProfil() {
    if (lieuRecherche.trim().length < 2) {
      setMessage(
        "Veuillez indiquer votre zone de recherche habituelle."
      );
      return;
    }
    setLoading(true);
    setMessage("");
    // Recherche des coordonnées du lieu
    const geocodeResponse = await fetch(
      `/api/geocode?q=${encodeURIComponent(
        lieuRecherche.trim()
      )}`
    );

    if (!geocodeResponse.ok) {
      setMessage(
        "Impossible de trouver cette localisation."
      );
      setLoading(false);
      return;
    }

    const localisation =
      await geocodeResponse.json();

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        nom: nom.trim(),
        age: Number(age),
        sexe: sexe,

        lieu_recherche: lieuRecherche.trim(),

        rayon_recherche_km:
          Number(rayonRecherche),

        position_recherche:
          `POINT(${localisation.longitude} ${localisation.latitude})`,
      });

    if (error) {
      setMessage("Erreur : " + error.message);
    } else {
      setMessage("Profil enregistré.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-5">

      <div>
        <label className="mb-1 block font-medium">
          Nom
        </label>

        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Vincent"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Âge
        </label>

        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full rounded border p-2"
          min="16"
          max="100"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Sexe
        </label>

        <select
          value={sexe}
          onChange={(e) => setSexe(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="homme">Homme</option>
          <option value="femme">Femme</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block font-medium">
          <p className="mt-1 text-sm text-gray-500">
            Cette zone sera utilisée par défaut pour rechercher
            les sorties. Données © OpenStreetMap contributors.
          </p>
        </label>

        <input
          type="text"
          value={lieuRecherche}
          onChange={(e) => setLieuRecherche(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Chambéry"
        />

        <p className="mt-1 text-sm text-gray-500">
          Cette zone sera utilisée par défaut pour rechercher les sorties.
        </p>
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Rayon de recherche
        </label>

        <select
          value={rayonRecherche}
          onChange={(e) => setRayonRecherche(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="20">20 km</option>
          <option value="30">30 km</option>
          <option value="50">50 km</option>
          <option value="100">100 km</option>
        </select>
      </div>

      <button
        type="button"
        onClick={enregistrerProfil}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white"
      >
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>

      {message && (
        <p>{message}</p>
      )}

    </div>
  );
}