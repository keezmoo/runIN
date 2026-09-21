"use client";

import { FormEvent, useState } from "react";

import SelecteurLieu, { type Localisation } from "@/app/sorties/selecteur-lieu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  initialPosition: Localisation | null;
};

type PositionRecherche = {
  latitude: number;
  longitude: number;
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
const RAYONS_KM = [1, 2, 3, 5, 10, 15, 20] as const;

const LIEU_PROFIL_PAR_DEFAUT =
  "Fontaine des Éléphants, 10 Pl. des Éléphants, 73000 Chambéry";

const POSITION_PROFIL_PAR_DEFAUT = {
  latitude: 45.566597,
  longitude: 5.922878,
};

function indexRayonLePlusProche(valeur: number) {
  let meilleurIndex = 0;
  let meilleureDifference = Infinity;

  RAYONS_KM.forEach((rayon, index) => {
    const difference = Math.abs(rayon - valeur);

    if (difference < meilleureDifference) {
      meilleureDifference = difference;

      meilleurIndex = index;
    }
  });

  return meilleurIndex;
}
export default function ProfileForm({
  userId,
  initialProfile,
  initialPosition,
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
    lieuRecherche: initialProfile?.lieu_recherche ?? LIEU_PROFIL_PAR_DEFAUT,
    rayonRecherche: rayonInitial,
  };

  const [valeurs, setValeurs] = useState<ValeursProfil>(valeursInitiales);

  const [valeursSauvegardees, setValeursSauvegardees] =
    useState<ValeursProfil>(valeursInitiales);

  const [edition, setEdition] = useState(initialProfile === null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const positionInitiale = initialPosition ?? POSITION_PROFIL_PAR_DEFAUT;

  const [positionRecherche, setPositionRecherche] =
    useState<PositionRecherche | null>(positionInitiale);

  const [positionSauvegardee, setPositionSauvegardee] =
    useState<PositionRecherche | null>(positionInitiale);

  // ------------------------------------------------
  // ANNULATION
  // ------------------------------------------------

  function annulerModification() {
    setValeurs(valeursSauvegardees);

    setPositionRecherche(positionSauvegardee);

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
      setMessage("Veuillez indiquer votre pseudonyme.");

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

    if (!positionRecherche) {
      setMessage(
        "Localisez votre zone de recherche avant d'enregistrer le profil.",
      );

      return;
    }

    if (
      !Number.isFinite(positionRecherche.latitude) ||
      !Number.isFinite(positionRecherche.longitude)
    ) {
      setMessage("La position de recherche est invalide.");

      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        nom,
        age,
        sexe: valeurs.sexe,
        description: valeurs.description.trim() || null,
        lieu_recherche: lieu,
        rayon_recherche_km: rayon,
        position_recherche: `POINT(${positionRecherche.longitude} ${positionRecherche.latitude})`,
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
      setPositionSauvegardee(positionRecherche);

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

  // ------------------------------------------------
  // MODE LECTURE
  // ------------------------------------------------

  if (!edition) {
    return (
      <div className="space-y-6">
        {/* PROFIL */}

        <section>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                Informations personnelles
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Informations visibles sur votre profil.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setMessage("");
                setEdition(true);
              }}
            >
              Modifier
            </Button>
          </div>

          <Card className="p-4">
            <p className="font-semibold">{valeursSauvegardees.nom}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {valeursSauvegardees.age} ans
              {" • "}
              {afficherSexe(valeursSauvegardees.sexe)}
            </p>

            {valeursSauvegardees.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm">
                {valeursSauvegardees.description}
              </p>
            )}
          </Card>
        </section>

        {/* ZONE DE RECHERCHE */}

        <section>
          <h2 className="text-lg font-semibold">Zone de recherche</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Utilisée par défaut lorsque vous recherchez des sorties.
          </p>

          <Card className="mt-3 flex items-center gap-3 p-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>

            <span className="min-w-0 truncate font-medium">
              {valeursSauvegardees.lieuRecherche}
              {" · "}
              {valeursSauvegardees.rayonRecherche} km
            </span>
          </Card>
        </section>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
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
        <h2 className="text-lg font-semibold">Informations personnelles</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Ces informations permettent aux autres coureurs de vous identifier.
        </p>

        <div className="mt-5 space-y-5">
          {/* NOM */}

          <div>
            <label className="mb-1 block font-medium">Prénom</label>

            <Input
              type="text"
              value={valeurs.nom}
              onChange={(event) =>
                setValeurs((valeursActuelles) => ({
                  ...valeursActuelles,
                  nom: event.target.value,
                }))
              }
              placeholder="Votre prénom"
            />
          </div>

          {/* ÂGE */}

          <div>
            <label className="mb-1 block font-medium">Âge</label>

            <Input
              type="number"
              value={valeurs.age}
              onChange={(event) =>
                setValeurs((valeursActuelles) => ({
                  ...valeursActuelles,
                  age: event.target.value,
                }))
              }
              min="16"
              max="100"
            />
          </div>

          {/* SEXE */}

          <div>
            <label className="mb-1 block font-medium">Sexe</label>

            <select
              value={valeurs.sexe}
              onChange={(event) =>
                setValeurs((valeursActuelles) => ({
                  ...valeursActuelles,

                  sexe: normaliserSexe(event.target.value),
                }))
              }
              className="
  flex
  h-10
  w-full
  rounded-md
  border
  border-input
  bg-background
  px-3
  py-2
  text-sm
  ring-offset-background
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
"
            >
              <option value="homme">Homme</option>

              <option value="femme">Femme</option>

              <option value="autre">Autre</option>
            </select>
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-1 block font-medium">À propos de moi</label>

            <Textarea
              value={valeurs.description}
              onChange={(event) =>
                setValeurs((valeursActuelles) => ({
                  ...valeursActuelles,
                  description: event.target.value,
                }))
              }
              maxLength={500}
              rows={4}
              className="resize-y"
              placeholder="Quelques mots sur votre pratique de la course, ce que vous recherchez..."
            />

            <p className="mt-1 text-right text-xs text-muted-foreground">
              {valeurs.description.length} / 500
            </p>
          </div>
        </div>
      </section>

      {/* ZONE DE RECHERCHE */}

      <section className="border-t pt-6">
        <h2 className="text-lg font-semibold">Zone de recherche</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Cette zone sera utilisée automatiquement pour rechercher les sorties
          autour de vous.
        </p>

        <div className="mt-5">
          <SelecteurLieu
            lieu={valeurs.lieuRecherche}
            onLieuChange={(lieuRecherche) =>
              setValeurs((valeursActuelles) => ({
                ...valeursActuelles,
                lieuRecherche,
              }))
            }
            localisation={positionRecherche}
            onLocalisationChange={setPositionRecherche}
            libelle="Lieu de recherche"
            placeholder="Chambéry"
            resumeSupplementaire={
              valeurs.lieuRecherche ? (
                <>
                  {" · "}
                  {valeurs.rayonRecherche} km
                </>
              ) : null
            }
            contenuSupplementaire={
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">Rayon de recherche</span>

                  <span className="font-medium">
                    {valeurs.rayonRecherche} km
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={RAYONS_KM.length - 1}
                  step={1}
                  value={indexRayonLePlusProche(valeurs.rayonRecherche)}
                  onChange={(event) => {
                    const index = Number(event.target.value);

                    setValeurs((valeursActuelles) => ({
                      ...valeursActuelles,
                      rayonRecherche: RAYONS_KM[index],
                    }));
                  }}
                  className="w-full"
                />

                <div className="-mt-1 grid grid-cols-7 text-center">
                  {RAYONS_KM.map((rayon) => (
                    <button
                      key={rayon}
                      type="button"
                      onClick={() =>
                        setValeurs((valeursActuelles) => ({
                          ...valeursActuelles,
                          rayonRecherche: rayon,
                        }))
                      }
                      className={`text-[10px] ${
                        valeurs.rayonRecherche === rayon
                          ? "font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {rayon}
                    </button>
                  ))}
                </div>
              </div>
            }
            rayonCarteKm={valeurs.rayonRecherche}
            aideCarte="Cliquez sur la carte ou déplacez le point pour modifier le centre de votre zone de recherche."
          />
        </div>
      </section>

      {/* ACTIONS */}

      <div className="flex justify-end gap-3 border-t pt-5">
        {initialProfile && (
          <Button
            type="button"
            variant="outline"
            onClick={annulerModification}
            disabled={loading}
          >
            Annuler
          </Button>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {message && (
        <p
          className={
            message === "Profil enregistré."
              ? "text-sm text-primary-strong"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
