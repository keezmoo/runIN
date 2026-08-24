"use client";

import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Sexe = "homme" | "femme" | "autre";

type Profile = {
  nom: string;
  age: number;
  sexe: string;
  description: string | null;
  lieu_recherche: string | null;
  rayon_recherche_km: number;
  position_recherche: string | null;
} | null;

type ProfileFormProps = {
  userId: string;
  initialProfile: Profile;
};

type ValeursProfil = {
  nom: string;
  age: string;
  sexe: Sexe;
  description: string;
  lieuRecherche: string;
  rayonRecherche: number;
};

function normaliserSexe(sexe?: string | null): Sexe {
  if (sexe === "homme" || sexe === "femme" || sexe === "autre") {
    return sexe;
  }

  return "homme";
}

function afficherSexe(sexe: Sexe) {
  if (sexe === "femme") {
    return "Femme";
  }

  if (sexe === "autre") {
    return "Autre";
  }

  return "Homme";
}

export default function ProfileForm({
  userId,
  initialProfile,
}: ProfileFormProps) {
  const rayonInitial = Math.min(
    20,
    Math.max(1, Number(initialProfile?.rayon_recherche_km) || 10),
  );

  const valeursInitiales: ValeursProfil = {
    nom: initialProfile?.nom ?? "",
    age: initialProfile?.age?.toString() ?? "",
    sexe: normaliserSexe(initialProfile?.sexe),
    description: initialProfile?.description ?? "",
    lieuRecherche: initialProfile?.lieu_recherche ?? "",
    rayonRecherche: rayonInitial,
  };

  const [valeurs, setValeurs] = useState<ValeursProfil>(valeursInitiales);

  const [valeursSauvegardees, setValeursSauvegardees] =
    useState<ValeursProfil>(valeursInitiales);

  const [edition, setEdition] = useState(initialProfile === null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  // ------------------------------------------------
  // ANNULATION
  // ------------------------------------------------

  function annulerModification() {
    setValeurs(valeursSauvegardees);

    setMessage("");

    setEdition(false);
  }

  // ------------------------------------------------
  // ENREGISTREMENT
  // ------------------------------------------------

  async function enregistrerProfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    const nom = valeurs.nom.trim();

    const age = Number(valeurs.age);

    const lieu = valeurs.lieuRecherche.trim();

    const rayon = Number(valeurs.rayonRecherche);

    if (nom.length < 2) {
      setMessage("Veuillez indiquer votre nom.");

      return;
    }

    if (!Number.isInteger(age) || age < 16 || age > 100) {
      setMessage("Veuillez indiquer un âge valide.");

      return;
    }

    if (lieu.length < 2) {
      setMessage("Veuillez indiquer votre zone de recherche habituelle.");

      return;
    }

    if (!Number.isFinite(rayon) || rayon < 1 || rayon > 20) {
      setMessage("Le rayon de recherche doit être compris entre 1 et 20 km.");

      return;
    }

    setLoading(true);

    try {
      // Recherche des coordonnées
      // correspondant au lieu.

      const geocodeResponse = await fetch(
        `/api/geocode?q=${encodeURIComponent(lieu)}`,
      );

      if (!geocodeResponse.ok) {
        setMessage("Impossible de trouver cette localisation.");

        return;
      }

      const localisation = await geocodeResponse.json();

      const supabase = createClient();

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        nom,
        age,
        sexe: valeurs.sexe,
        description: valeurs.description.trim() || null,
        lieu_recherche: lieu,
        rayon_recherche_km: rayon,
        position_recherche: `POINT(${localisation.longitude} ${localisation.latitude})`,
      });

      if (error) {
        console.error("Erreur enregistrement profil :", error);

        setMessage("Impossible d'enregistrer le profil.");

        return;
      }

      const nouvellesValeurs: ValeursProfil = {
        nom,
        age: String(age),
        sexe: valeurs.sexe,
        description: valeurs.description.trim(),
        lieuRecherche: lieu,
        rayonRecherche: rayon,
      };

      setValeurs(nouvellesValeurs);

      setValeursSauvegardees(nouvellesValeurs);

      setEdition(false);

      setMessage("Profil enregistré.");
    } catch (erreur) {
      console.error("Erreur enregistrement profil :", erreur);

      setMessage("Impossible d'enregistrer le profil.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // MODE LECTURE
  // ------------------------------------------------

  if (!edition) {
    return (
      <div className="space-y-8">
        {/* PROFIL */}

        <section>
          <div
            className="
            mb-4
            flex
            items-start
            justify-between
            gap-4
          "
          >
            <div>
              <h2
                className="
                text-lg
                font-semibold
              "
              >
                Informations personnelles
              </h2>

              <p
                className="
                mt-1
                text-sm
                text-gray-500
              "
              >
                Informations visibles sur votre profil.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEdition(true);
              }}
              className="
                shrink-0
                rounded
                border
                px-3
                py-2
                text-sm
              "
            >
              Modifier
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-medium">{valeursSauvegardees.nom}</p>

            <p className="text-sm">
              {valeursSauvegardees.age} ans
              {" • "}
              {afficherSexe(valeursSauvegardees.sexe)}
            </p>
            {valeursSauvegardees.description && (
              <p
                className="
    mt-4
    whitespace-pre-wrap
    text-sm
  "
              >
                {valeursSauvegardees.description}
              </p>
            )}
          </div>
        </section>

        {/* ZONE DE RECHERCHE */}

        <section
          className="
          border-t
          pt-6
        "
        >
          <h2
            className="
            text-lg
            font-semibold
          "
          >
            Zone de recherche
          </h2>

          <p
            className="
            mt-1
            text-sm
            text-gray-500
          "
          >
            Utilisée par défaut lorsque vous recherchez des sorties.
          </p>

          <div
            className="
            mt-4
            space-y-2
          "
          >
            <p>
              <span className="font-medium">Lieu :</span>{" "}
              {valeursSauvegardees.lieuRecherche}
            </p>

            <p>
              <span className="font-medium">Rayon :</span>{" "}
              {valeursSauvegardees.rayonRecherche} km
            </p>
          </div>
        </section>

        {message && <p className="text-sm">{message}</p>}
      </div>
    );
  }

  // ------------------------------------------------
  // MODE MODIFICATION
  // ------------------------------------------------

  return (
    <form onSubmit={enregistrerProfil} className="space-y-8">
      {/* INFORMATIONS PERSONNELLES */}

      <section>
        <h2
          className="
          text-lg
          font-semibold
        "
        >
          Informations personnelles
        </h2>

        <p
          className="
          mt-1
          text-sm
          text-gray-500
        "
        >
          Ces informations permettent aux autres coureurs de vous identifier.
        </p>

        <div
          className="
          mt-5
          space-y-5
        "
        >
          <div>
            <label
              className="
              mb-1
              block
              font-medium
            "
            >
              Nom
            </label>

            <input
              type="text"
              value={valeurs.nom}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,
                  nom: event.target.value,
                })
              }
              className="
                w-full
                rounded
                border
                p-2
              "
              placeholder="Vincent"
            />
          </div>

          <div>
            <label
              className="
              mb-1
              block
              font-medium
            "
            >
              Âge
            </label>

            <input
              type="number"
              value={valeurs.age}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,
                  age: event.target.value,
                })
              }
              className="
                w-full
                rounded
                border
                p-2
              "
              min="16"
              max="100"
            />
          </div>

          <div>
            <label
              className="
              mb-1
              block
              font-medium
            "
            >
              Sexe
            </label>

            <select
              value={valeurs.sexe}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,

                  sexe: normaliserSexe(event.target.value),
                })
              }
              className="
                w-full
                rounded
                border
                p-2
              "
            >
              <option value="homme">Homme</option>

              <option value="femme">Femme</option>

              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium">À propos de moi</label>

            <textarea
              value={valeurs.description}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,
                  description: event.target.value,
                })
              }
              maxLength={500}
              rows={4}
              className="
      w-full
      resize-y
      rounded
      border
      p-2
    "
              placeholder="Quelques mots sur votre pratique de la course, ce que vous recherchez..."
            />

            <p className="mt-1 text-right text-xs text-gray-500">
              {valeurs.description.length} / 500
            </p>
          </div>
        </div>
      </section>

      {/* ZONE DE RECHERCHE */}

      <section
        className="
        border-t
        pt-6
      "
      >
        <h2
          className="
          text-lg
          font-semibold
        "
        >
          Zone de recherche
        </h2>

        <p
          className="
          mt-1
          text-sm
          text-gray-500
        "
        >
          Cette zone sera utilisée automatiquement pour rechercher les sorties
          autour de vous.
        </p>

        <div
          className="
          mt-5
          space-y-5
        "
        >
          <div>
            <label
              className="
              mb-1
              block
              font-medium
            "
            >
              Lieu habituel
            </label>

            <input
              type="text"
              value={valeurs.lieuRecherche}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,

                  lieuRecherche: event.target.value,
                })
              }
              className="
                w-full
                rounded
                border
                p-2
              "
              placeholder="Chambéry"
            />

            <p
              className="
              mt-1
              text-xs
              text-gray-500
            "
            >
              Données © OpenStreetMap contributors.
            </p>
          </div>

          <div>
            <div
              className="
              mb-1
              flex
              justify-between
              text-sm
            "
            >
              <label className="font-medium">Rayon habituel</label>

              <span>{valeurs.rayonRecherche} km</span>
            </div>

            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={valeurs.rayonRecherche}
              onChange={(event) =>
                setValeurs({
                  ...valeurs,

                  rayonRecherche: Number(event.target.value),
                })
              }
              className="w-full"
            />

            <div
              className="
              flex
              justify-between
              text-xs
              text-gray-500
            "
            >
              <span>1 km</span>
              <span>20 km</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIONS */}

      <div
        className="
        flex
        justify-end
        gap-3
        border-t
        pt-5
      "
      >
        {initialProfile && (
          <button
            type="button"
            onClick={annulerModification}
            disabled={loading}
            className="
              rounded
              border
              px-4
              py-2
            "
          >
            Annuler
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="
            rounded
            border
            px-4
            py-2
            font-medium
          "
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
