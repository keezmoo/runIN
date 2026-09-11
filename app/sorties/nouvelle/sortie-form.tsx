"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { maintenantDatetimeLocal } from "@/lib/date-utils";
import {
  TYPES_ENTRAINEMENT,
  INTENSITES,
  validerDonneesSportives,
} from "@/lib/sortie-utils";
import SelecteurLieu, { type Localisation } from "../selecteur-lieu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleButton } from "@/components/ui/toggle-button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Checkbox } from "@/components/ui/checkbox";

type Genre = "homme" | "femme" | "autre";

type SortieFormProps = {
  sexeOrganisateur: Genre;
  lieuInitial: string;
  localisationInitiale: Localisation;
};

export default function SortieForm({
  sexeOrganisateur,
  lieuInitial,
  localisationInitiale,
}: SortieFormProps) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [nombreMax, setNombreMax] = useState("2");

  // Date + heure sélectionnées par l'utilisateur
  const [dateHeure, setDateHeure] = useState("");
  const [lieuDepart, setLieuDepart] = useState(lieuInitial);

  const [localisation, setLocalisation] = useState<Localisation | null>(
    localisationInitiale,
  );
  const [typeSortie, setTypeSortie] = useState("route");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeInscription, setModeInscription] = useState("automatique");
  const [typeEntrainement, setTypeEntrainement] = useState(
    "endurance_fondamentale",
  );
  const [distanceKm, setDistanceKm] = useState("");
  const [denivelePositif, setDenivelePositif] = useState("");
  const [dureeHeures, setDureeHeures] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState("");
  const [intensite, setIntensite] = useState("moderee");
  const [allureMinutes, setAllureMinutes] = useState("");
  const [allureSecondes, setAllureSecondes] = useState("");
  const [description, setDescription] = useState("");
  const [deniveleRouteVisible, setDeniveleRouteVisible] = useState(false);

  const [dureeVisible, setDureeVisible] = useState(false);

  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [genresAutorises, setGenresAutorises] = useState<Genre[]>([
    "homme",
    "femme",
    "autre",
  ]);
  const [dateHeureMin] = useState(() => maintenantDatetimeLocal());
  function basculerGenre(genre: Genre) {
    if (genre === sexeOrganisateur) {
      return;
    }

    setGenresAutorises((genresActuels) => {
      if (genresActuels.includes(genre)) {
        return genresActuels.filter((item) => item !== genre);
      }

      return [...genresActuels, genre];
    });
  }
  async function creerSortie() {
    setMessage("");

    // Vérification du titre
    if (titre.trim().length < 3) {
      setMessage("Le titre doit contenir au moins 3 caractères.");
      return;
    }

    // Vérification du nombre de participants
    const nombre = Number(nombreMax);

    if (nombre < 2 || nombre > 25) {
      setMessage("Le nombre de participants doit être compris entre 2 et 25.");
      return;
    }

    // Vérification de la date
    if (!dateHeure) {
      setMessage("Veuillez choisir une date et une heure.");
      return;
    }

    const dateDepart = new Date(dateHeure);

    if (Number.isNaN(dateDepart.getTime()) || dateDepart <= new Date()) {
      setMessage("La date et l'heure de départ doivent être dans le futur.");
      return;
    }

    if (lieuDepart.trim().length < 2) {
      setMessage("Veuillez indiquer un lieu de départ.");
      return;
    }

    if (!localisation) {
      setMessage(
        "Localisez le lieu de départ et vérifiez sa position sur la carte.",
      );
      return;
    }

    // ------------------------------------------------
    // DONNÉES SPORTIVES
    // ------------------------------------------------

    const validationSportive = validerDonneesSportives({
      typeSortie,
      distanceKm,
      denivelePositif,
      dureeHeures,
      dureeMinutes,
      allureMinutes,
      allureSecondes,
    });

    if (!validationSportive.ok) {
      setMessage(validationSportive.message);
      return;
    }

    const { distance, denivele, dureeEstimeeMinutes, allureSecondesKm } =
      validationSportive;

    if (genresAutorises.length === 0) {
      setMessage("Sélectionnez au moins un genre autorisé à participer.");

      return;
    }

    setLoading(true);

    const supabase = createClient();

    console.log(
      "DEBUG_CREATION_SORTIE",
      [
        `typeSortie=${typeSortie}`,
        `deniveleChamp="${denivelePositif}"`,
        `denivele=${String(denivele)}`,
        `typeDenivele=${typeof denivele}`,
        `latitude=${localisation.latitude}`,
        `longitude=${localisation.longitude}`,
      ].join(" | "),
    );

    const { data, error } = await supabase.rpc("creer_sortie_securisee", {
      p_titre: titre.trim(),

      p_genres_autorises: genresAutorises,

      p_nombre_max_participants: nombre,

      p_date_heure_depart: new Date(dateHeure).toISOString(),

      p_lieu_depart: lieuDepart.trim(),

      p_type_sortie: typeSortie,

      p_longitude: localisation.longitude,

      p_latitude: localisation.latitude,

      p_mode_inscription: modeInscription,

      p_type_entrainement: typeEntrainement,

      p_distance_km: distance,

      p_denivele_positif_m: denivele,

      p_duree_estimee_minutes: dureeEstimeeMinutes,

      p_intensite: intensite,

      p_allure_secondes_km: typeSortie === "route" ? allureSecondesKm : null,

      p_description: description.trim() || null,
    });

    if (error) {
      if (error.message.includes("NOMBRE_PARTICIPANTS_INVALIDE")) {
        setMessage(
          "Le nombre de participants doit être compris entre 2 et 25.",
        );
        setLoading(false);
        return;
      }

      if (error.message.includes("GENRE_ORGANISATEUR_REQUIS")) {
        setMessage(
          "Vous devez autoriser votre propre genre à participer à la sortie.",
        );

        setLoading(false);
        return;
      }

      if (error.message.includes("GENRES_AUTORISES_INVALIDES")) {
        setMessage("La sélection des participants autorisés n'est pas valide.");

        setLoading(false);
        return;
      }

      console.error("Erreur création sortie :", error);

      setMessage(`Impossible de créer la sortie : ${error.message}`);

      setLoading(false);
      return;

      setMessage("Impossible de créer la sortie.");

      setLoading(false);
      return;
    }

    const resultat = data as {
      statut?: string;
      sortie_id?: string;
      secondes_restantes?: number;
    } | null;

    // ------------------------------------------------
    // ANTI-SPAM
    // ------------------------------------------------

    if (resultat?.statut === "BLOQUEE") {
      const secondes = resultat.secondes_restantes ?? 3600;

      const minutes = Math.max(1, Math.ceil(secondes / 60));

      if (minutes >= 60) {
        setMessage(
          "Vous avez créé trop de sorties en peu de temps. Nouvelle création possible dans environ 1 heure.",
        );
      } else {
        setMessage(
          `Vous avez créé trop de sorties en peu de temps. Nouvelle création possible dans ${minutes} min.`,
        );
      }

      setLoading(false);

      return;
    }

    // ------------------------------------------------
    // SORTIE CRÉÉE
    // ------------------------------------------------

    if (resultat?.statut !== "CREEE" || !resultat.sortie_id) {
      setMessage("La sortie n'a pas pu être créée.");

      setLoading(false);

      return;
    }

    router.replace(`/sorties/${resultat.sortie_id}`);
  }

  function empecherModificationMolette(
    event: React.WheelEvent<HTMLInputElement>,
  ) {
    event.currentTarget.blur();
  }

  return (
    <div className="space-y-8">
      {/* ==================================================
        TYPE DE SORTIE
    ================================================== */}

      <div>
        <p className="mb-2 font-medium">Type de sortie</p>

        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            type="button"
            pressed={typeSortie === "route"}
            onClick={() => setTypeSortie("route")}
            className="py-3"
          >
            Route
          </ToggleButton>

          <ToggleButton
            type="button"
            pressed={typeSortie === "trail"}
            onClick={() => setTypeSortie("trail")}
            className="py-3"
          >
            Trail
          </ToggleButton>
        </div>
      </div>

      {/* ==================================================
        INFORMATIONS PRINCIPALES
    ================================================== */}

      <section className="space-y-5">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">Informations principales</h2>
        </div>

        {/* TITRE */}

        <div>
          <label className="mb-1 block font-medium">Titre de la sortie</label>

          <Input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Trail tranquille au Nivolet"
          />
        </div>

        {/* LIEU */}

        <SelecteurLieu
          lieu={lieuDepart}
          onLieuChange={setLieuDepart}
          localisation={localisation}
          onLocalisationChange={setLocalisation}
        />

        {/* DATE */}

        <div>
          <label className="mb-1 block font-medium">
            Date et heure de départ
          </label>

          <Input
            type="datetime-local"
            value={dateHeure}
            onChange={(e) => setDateHeure(e.target.value)}
            min={dateHeureMin || undefined}
          />
        </div>
      </section>

      {/* ==================================================
        ENTRAÎNEMENT
    ================================================== */}

      <section className="space-y-5">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">Entraînement</h2>
        </div>

        {/* TYPE D'ENTRAÎNEMENT */}

        <div>
          <label className="mb-1 block font-medium">
            Type d&apos;entraînement
          </label>

          <Select
            value={typeEntrainement}
            onChange={(e) => setTypeEntrainement(e.target.value)}
            required
          >
            {TYPES_ENTRAINEMENT.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        {/* DISTANCE + D+ TRAIL */}

        <div
          className={typeSortie === "trail" ? "grid gap-4 sm:grid-cols-2" : ""}
        >
          <div>
            <label className="mb-1 block font-medium">Distance</label>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                inputMode="decimal"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                required
                onWheel={empecherModificationMolette}
              />

              <span className="shrink-0">km</span>
            </div>
          </div>

          {typeSortie === "trail" && (
            <div>
              <label className="mb-1 block font-medium">Dénivelé positif</label>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={denivelePositif}
                  onChange={(e) => setDenivelePositif(e.target.value)}
                  onWheel={empecherModificationMolette}
                />

                <span className="shrink-0">m D+</span>
              </div>
            </div>
          )}
        </div>

        {/* D+ FACULTATIF ROUTE */}

        {typeSortie === "route" && (
          <div>
            {!deniveleRouteVisible && denivelePositif === "" ? (
              <Button
                type="button"
                variant="link"
                onClick={() => setDeniveleRouteVisible(true)}
              >
                + Ajouter du dénivelé
              </Button>
            ) : (
              <div>
                <label className="mb-1 block font-medium">
                  Dénivelé positif
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    (facultatif)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={denivelePositif}
                    onChange={(e) => setDenivelePositif(e.target.value)}
                    onWheel={empecherModificationMolette}
                  />

                  <span className="shrink-0">m D+</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INTENSITÉ */}

        <div>
          <p className="mb-2 font-medium">Intensité</p>

          <div className="grid grid-cols-3 gap-2">
            {INTENSITES.map((item) => (
              <ToggleButton
                key={item.value}
                type="button"
                size="sm"
                pressed={intensite === item.value}
                onClick={() => setIntensite(item.value)}
              >
                {item.label}
              </ToggleButton>
            ))}
          </div>
        </div>

        {/* ALLURE : ROUTE UNIQUEMENT */}

        {typeSortie === "route" && (
          <div>
            <label className="mb-1 block font-medium">
              Allure moyenne prévue
            </label>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="5"
                value={allureMinutes}
                onChange={(e) => setAllureMinutes(e.target.value)}
                className="w-20 rounded border p-2"
                onWheel={empecherModificationMolette}
              />

              <span>:</span>

              <Input
                type="number"
                min="0"
                max="59"
                step="1"
                placeholder="30"
                value={allureSecondes}
                onChange={(e) => setAllureSecondes(e.target.value)}
                className="w-20 rounded border p-2"
                onWheel={empecherModificationMolette}
              />

              <span>/ km</span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Exemple : 5:30 / km
            </p>
          </div>
        )}

        {/* DURÉE FACULTATIVE */}

        {!dureeVisible && dureeHeures === "" && dureeMinutes === "" ? (
          <Button
            type="button"
            variant="link"
            onClick={() => setDureeVisible(true)}
          >
            + Ajouter une durée estimée
          </Button>
        ) : (
          <div>
            <label className="mb-1 block font-medium">
              Durée totale estimée
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                (facultatif)
              </span>
            </label>

            <p className="mb-2 text-xs text-muted-foreground">
              Temps global prévu, pauses et arrêts compris.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="1"
                value={dureeHeures}
                onChange={(e) => setDureeHeures(e.target.value)}
                className="w-20 rounded border p-2"
                onWheel={empecherModificationMolette}
              />

              <span>h</span>

              <input
                type="number"
                min="0"
                max="59"
                step="1"
                placeholder="30"
                value={dureeMinutes}
                onChange={(e) => setDureeMinutes(e.target.value)}
                className="w-20 rounded border p-2"
                onWheel={empecherModificationMolette}
              />

              <span>min</span>
            </div>
          </div>
        )}

        {/* DESCRIPTION FACULTATIVE */}

        {!descriptionVisible && description === "" ? (
          <Button
            type="button"
            variant="link"
            onClick={() => setDescriptionVisible(true)}
          >
            + Ajouter une description
          </Button>
        ) : (
          <div>
            <label className="mb-1 block font-medium">
              Description
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                (facultatif)
              </span>
            </label>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Décris la sortie, le parcours, l'objectif de l'entraînement, les éventuelles pauses..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {description.length} / 1000
            </p>
          </div>
        )}
      </section>

      {/* ==================================================
        PARTICIPATION
    ================================================== */}

      <section className="space-y-5">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold">Participation</h2>
        </div>

        {/* NOMBRE MAXIMUM */}

        <div>
          <label className="mb-1 block font-medium">
            Nombre maximum de participants
          </label>

          <input
            type="number"
            value={nombreMax}
            onChange={(e) => setNombreMax(e.target.value)}
            className="w-full rounded border p-2"
            min="2"
            max="25"
            onWheel={empecherModificationMolette}
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Vous êtes compris dans ce nombre.
          </p>
        </div>

        {/* PARTICIPANTS AUTORISÉS */}

        <div>
          <label className="mb-2 block font-medium">
            Participants autorisés
          </label>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label
              className={
                sexeOrganisateur === "femme"
                  ? "flex cursor-not-allowed items-center gap-2 opacity-50"
                  : "flex items-center gap-2"
              }
            >
              <Checkbox
                checked={genresAutorises.includes("femme")}
                disabled={sexeOrganisateur === "femme"}
                onCheckedChange={() => basculerGenre("femme")}
              />
              Femmes
            </label>

            <label
              className={
                sexeOrganisateur === "homme"
                  ? "flex cursor-not-allowed items-center gap-2 opacity-50"
                  : "flex items-center gap-2"
              }
            >
              <Checkbox
                checked={genresAutorises.includes("homme")}
                disabled={sexeOrganisateur === "homme"}
                onCheckedChange={() => basculerGenre("homme")}
              />
              Hommes
            </label>

            <label
              className={
                sexeOrganisateur === "autre"
                  ? "flex cursor-not-allowed items-center gap-2 opacity-50"
                  : "flex items-center gap-2"
              }
            >
              <Checkbox
                checked={genresAutorises.includes("autre")}
                disabled={sexeOrganisateur === "autre"}
                onCheckedChange={() => basculerGenre("autre")}
              />
              Autre
            </label>
          </div>
        </div>

        {/* INSCRIPTION */}

        <div>
          <label className="mb-2 block font-medium">
            Inscription des participants
          </label>

          <div className="space-y-2">
            <ChoiceCard
              name="modeInscription"
              value="automatique"
              checked={modeInscription === "automatique"}
              onChange={setModeInscription}
              title="Inscription automatique"
              description="Toute personne qui clique sur Participer rejoint immédiatement la sortie."
            />

            <ChoiceCard
              name="modeInscription"
              value="validation"
              checked={modeInscription === "validation"}
              onChange={setModeInscription}
              title="Validation par l’organisateur"
              description="Vous acceptez ou refusez chaque demande avant que la personne rejoigne la sortie."
            />
          </div>
        </div>
      </section>

      {/* ==================================================
        CRÉATION
    ================================================== */}

      <div className="space-y-3">
        {message && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <span>{message}</span>
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={creerSortie}
          disabled={loading}
        >
          {loading ? "Création..." : "Créer la sortie"}
        </Button>
      </div>
    </div>
  );
}
