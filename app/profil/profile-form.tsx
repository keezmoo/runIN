"use client";

import { FormEvent, useRef, useState } from "react";

import CarteZoneRecherche from "@/app/sorties/carte-zone-recherche";
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
  initialPosition: PositionRecherche | null;
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
    lieuRecherche: initialProfile?.lieu_recherche ?? "",
    rayonRecherche: rayonInitial,
  };

  const [valeurs, setValeurs] = useState<ValeursProfil>(valeursInitiales);

  const [valeursSauvegardees, setValeursSauvegardees] =
    useState<ValeursProfil>(valeursInitiales);

  const [edition, setEdition] = useState(initialProfile === null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [positionRecherche, setPositionRecherche] =
    useState<PositionRecherche | null>(initialPosition);

  const [positionSauvegardee, setPositionSauvegardee] =
    useState<PositionRecherche | null>(initialPosition);

  const [localisationOuverte, setLocalisationOuverte] = useState(false);

  const [rechercheLieuEnCours, setRechercheLieuEnCours] = useState(false);

  const [messageLocalisation, setMessageLocalisation] = useState("");

  const requeteReverseId = useRef(0);

  // ------------------------------------------------
  // ANNULATION
  // ------------------------------------------------

  function annulerModification() {
    setValeurs(valeursSauvegardees);

    setPositionRecherche(positionSauvegardee);

    setLocalisationOuverte(false);

    setMessageLocalisation("");
    setMessage("");

    setEdition(false);
  }
  // ------------------------------------------------
  // Localisation
  // ------------------------------------------------

  function modifierLieuRecherche(valeur: string) {
    setValeurs((valeursActuelles) => ({
      ...valeursActuelles,
      lieuRecherche: valeur,
    }));

    // Le texte saisi ne correspond plus
    // forcément au point enregistré.
    setPositionRecherche(null);

    setMessageLocalisation("");
  }

  async function localiserLieuRecherche() {
    const recherche = valeurs.lieuRecherche.trim();

    setMessageLocalisation("");

    if (recherche.length < 2) {
      setMessageLocalisation("Indiquez un lieu de recherche.");

      return;
    }

    setRechercheLieuEnCours(true);

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
        setMessageLocalisation(
          resultat.error ?? "Impossible de trouver ce lieu.",
        );

        return;
      }

      const latitude = Number(resultat.latitude);

      const longitude = Number(resultat.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setMessageLocalisation("Les coordonnées retournées sont invalides.");

        return;
      }

      const nouveauNom =
        typeof resultat.nom === "string" && resultat.nom.trim()
          ? resultat.nom.trim()
          : recherche;

      setValeurs((valeursActuelles) => ({
        ...valeursActuelles,
        lieuRecherche: nouveauNom,
      }));

      setPositionRecherche({
        latitude,
        longitude,
      });
    } catch (erreur) {
      console.error("Erreur localisation :", erreur);

      setMessageLocalisation(
        "Impossible de contacter le service de localisation.",
      );
    } finally {
      setRechercheLieuEnCours(false);
    }
  }

  async function changerCentreRecherche(latitude: number, longitude: number) {
    setPositionRecherche({
      latitude,
      longitude,
    });

    setMessageLocalisation("");

    setValeurs((valeursActuelles) => ({
      ...valeursActuelles,
      lieuRecherche: "Position personnalisée",
    }));

    const idRequete = ++requeteReverseId.current;

    try {
      const response = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(
          latitude,
        )}&lon=${encodeURIComponent(longitude)}`,
      );

      const resultat = (await response.json()) as {
        nom?: string;
        error?: string;
      };

      if (idRequete !== requeteReverseId.current) {
        return;
      }

      if (!response.ok) {
        console.error("Erreur géocodage inverse :", resultat.error);

        return;
      }

      if (typeof resultat.nom === "string" && resultat.nom.trim()) {
        const nouveauNom = resultat.nom.trim();

        setValeurs((valeursActuelles) => ({
          ...valeursActuelles,
          lieuRecherche: nouveauNom,
        }));
      }
    } catch (erreur) {
      console.error("Erreur géocodage inverse :", erreur);
    }
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

      setLocalisationOuverte(false);
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
                setMessageLocalisation("");
                setLocalisationOuverte(false);
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
            <label className="mb-1 block font-medium">Nom</label>

            <Input
              type="text"
              value={valeurs.nom}
              onChange={(event) =>
                setValeurs((valeursActuelles) => ({
                  ...valeursActuelles,
                  nom: event.target.value,
                }))
              }
              placeholder="Vincent"
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

        <div className="mt-5 overflow-hidden rounded-xl border">
          {/* RÉSUMÉ */}

          <Button
            type="button"
            variant="ghost"
            onClick={() => setLocalisationOuverte((ouverte) => !ouverte)}
            aria-expanded={localisationOuverte}
            className="h-auto w-full justify-between rounded-none px-4 py-3 text-left"
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
                {valeurs.lieuRecherche ? (
                  <>
                    {valeurs.lieuRecherche}
                    {" · "}
                    {valeurs.rayonRecherche} km
                  </>
                ) : (
                  "Ajouter une localisation"
                )}
              </span>
            </div>

            <span
              className={`shrink-0 text-lg transition-transform ${
                localisationOuverte ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </Button>

          {/* ÉDITEUR */}

          {localisationOuverte && (
            <div className="space-y-4 border-t p-4">
              {/* LIEU */}

              <div>
                <label
                  htmlFor="lieu-recherche-profil"
                  className="mb-1 block text-sm font-medium"
                >
                  Lieu de recherche
                </label>

                <div className="flex gap-2">
                  <Input
                    id="lieu-recherche-profil"
                    type="text"
                    value={valeurs.lieuRecherche}
                    onChange={(event) =>
                      modifierLieuRecherche(event.target.value)
                    }
                    placeholder="Chambéry"
                    className="min-w-0 flex-1"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={localiserLieuRecherche}
                    disabled={rechercheLieuEnCours}
                    className="shrink-0"
                  >
                    {rechercheLieuEnCours ? "Recherche..." : "Localiser"}
                  </Button>
                </div>

                {!positionRecherche && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cliquez sur « Localiser » pour positionner ce lieu.
                  </p>
                )}

                {messageLocalisation && (
                  <p className="mt-2 text-sm text-destructive">
                    {messageLocalisation}
                  </p>
                )}
              </div>

              {/* RAYON */}

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

              {/* CARTE */}

              {positionRecherche ? (
                <div>
                  <CarteZoneRecherche
                    latitude={positionRecherche.latitude}
                    longitude={positionRecherche.longitude}
                    rayonKm={valeurs.rayonRecherche}
                    onCentreChange={changerCentreRecherche}
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    Cliquez sur la carte ou déplacez le point pour modifier le
                    centre de la recherche.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Localisez un lieu pour afficher la carte.
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Données © OpenStreetMap contributors.
              </p>

              {/* VALIDATION LOCALISATION */}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!positionRecherche) {
                      setMessageLocalisation(
                        "Localisez d'abord le lieu saisi.",
                      );

                      return;
                    }

                    setMessageLocalisation("");
                    setLocalisationOuverte(false);
                  }}
                >
                  Valider la localisation
                </Button>
              </div>
            </div>
          )}
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
