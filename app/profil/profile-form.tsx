"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  nom: string;
  age: number;
  sexe: string;
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

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function enregistrerProfil() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        nom: nom.trim(),
        age: Number(age),
        sexe: sexe,
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