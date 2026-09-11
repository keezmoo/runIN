"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SelecteurLieu, { type Localisation } from "./selecteur-lieu";
import SelecteurRayon, { normaliserRayon } from "./selecteur-rayon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ToggleButton } from "@/components/ui/toggle-button";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SlidersHorizontal } from "lucide-react";

type TypeSortie = "" | "route" | "trail";

type Intensite = "" | "tranquille" | "moderee" | "soutenue";

type FiltresSortiesProps = {
  lieuActuel: string;
  rayonActuel: number;
  typeActuel: string;
  latitudeActuelle: number;
  longitudeActuelle: number;
};

function secondesVersAllure(secondesTexte: string | null) {
  if (!secondesTexte) {
    return "";
  }

  const total = Number(secondesTexte);

  if (!Number.isFinite(total) || total <= 0) {
    return "";
  }

  const minutes = Math.floor(total / 60);

  const secondes = Math.round(total % 60);

  return `${minutes}:${secondes.toString().padStart(2, "0")}`;
}

function allureVersSecondes(valeur: string) {
  const propre = valeur.trim();

  if (propre === "") {
    return null;
  }

  const resultat = /^(\d{1,2}):([0-5]\d)$/.exec(propre);

  if (!resultat) {
    return NaN;
  }

  return Number(resultat[1]) * 60 + Number(resultat[2]);
}

function nombreDepuisChamp(valeur: string) {
  if (valeur.trim() === "") {
    return null;
  }

  const nombre = Number(valeur.replace(",", "."));

  return Number.isFinite(nombre) ? nombre : NaN;
}

export default function FiltresSorties({
  lieuActuel,
  rayonActuel,
  typeActuel,
  latitudeActuelle,
  longitudeActuelle,
}: FiltresSortiesProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const [filtresOuverts, setFiltresOuverts] = useState(false);

  // ------------------------------------------------
  // FILTRES PRINCIPAUX
  // ------------------------------------------------

  const [typeSortie, setTypeSortie] = useState<TypeSortie>(
    typeActuel === "route" || typeActuel === "trail" ? typeActuel : "",
  );

  const [lieu, setLieu] = useState(lieuActuel);

  const [localisation, setLocalisation] = useState<Localisation | null>(() => {
    const latitude = Number(latitudeActuelle);
    const longitude = Number(longitudeActuelle);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  });

  const [rayon, setRayon] = useState(normaliserRayon(rayonActuel));
  // ------------------------------------------------
  // FILTRES SPORTIFS
  // ------------------------------------------------

  const [distanceMin, setDistanceMin] = useState(
    searchParams.get("distanceMin") ?? "",
  );

  const [distanceMax, setDistanceMax] = useState(
    searchParams.get("distanceMax") ?? "",
  );

  const [deniveleMin, setDeniveleMin] = useState(
    searchParams.get("deniveleMin") ?? "",
  );

  const [deniveleMax, setDeniveleMax] = useState(
    searchParams.get("deniveleMax") ?? "",
  );

  const [allureMin, setAllureMin] = useState(
    secondesVersAllure(searchParams.get("allureMin")),
  );

  const [allureMax, setAllureMax] = useState(
    secondesVersAllure(searchParams.get("allureMax")),
  );

  const intensiteParam = searchParams.get("intensite");

  const [intensite, setIntensite] = useState<Intensite>(
    intensiteParam === "tranquille" ||
      intensiteParam === "moderee" ||
      intensiteParam === "soutenue"
      ? intensiteParam
      : "",
  );

  const [typeEntrainement, setTypeEntrainement] = useState(
    searchParams.get("typeEntrainement") ?? "",
  );

  const [dureeMin, setDureeMin] = useState(searchParams.get("dureeMin") ?? "");

  const [dureeMax, setDureeMax] = useState(searchParams.get("dureeMax") ?? "");

  const genresParam = searchParams.get("genres");

  const [genres, setGenres] = useState<string[]>(
    genresParam ? genresParam.split(",") : [],
  );

  const [modeInscription, setModeInscription] = useState(
    searchParams.get("modeInscription") ?? "",
  );

  const [masquerCompletes, setMasquerCompletes] = useState(
    searchParams.get("masquerCompletes") !== "0",
  );
  const [avecSuivis, setAvecSuivis] = useState(
    searchParams.get("suivis") === "1",
  );
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  function appliquerFiltresRapides({
    type = typeSortie,
    suivis = avecSuivis,
    lieuRecherche,
    localisationRecherche,
    rayonRecherche,
  }: {
    type?: TypeSortie;
    suivis?: boolean;
    lieuRecherche?: string;
    localisationRecherche?: Localisation;
    rayonRecherche?: number;
  } = {}) {
    const params = new URLSearchParams(searchParams.toString());

    // ------------------------------------------------
    // TYPE DE SORTIE
    // ------------------------------------------------

    if (type) {
      params.set("type", type);
    } else {
      params.delete("type");
    }

    // Les filtres spécifiques à un terrain ne doivent
    // pas rester actifs lorsqu'on change de terrain.

    if (type === "route") {
      params.delete("deniveleMin");
      params.delete("deniveleMax");
    } else if (type === "trail") {
      params.delete("allureMin");
      params.delete("allureMax");
    } else {
      params.delete("deniveleMin");
      params.delete("deniveleMax");
      params.delete("allureMin");
      params.delete("allureMax");
    }

    // ------------------------------------------------
    // CONTACTS
    // ------------------------------------------------

    if (suivis) {
      params.set("suivis", "1");
    } else {
      params.delete("suivis");
    }

    // ------------------------------------------------
    // LOCALISATION
    // ------------------------------------------------

    if (
      lieuRecherche !== undefined &&
      localisationRecherche !== undefined &&
      rayonRecherche !== undefined
    ) {
      params.set("lieu", lieuRecherche.trim());
      params.set("rayon", String(rayonRecherche));
      params.set("lat", String(localisationRecherche.latitude));
      params.set("lon", String(localisationRecherche.longitude));
    }

    router.replace(`/sorties?${params.toString()}`, {
      scroll: false,
    });
  }
  // ------------------------------------------------
  // CHANGEMENT DE SPORT
  // ------------------------------------------------

  function choisirType(nouveauType: TypeSortie) {
    setTypeSortie(nouveauType);

    if (nouveauType === "route") {
      setDeniveleMin("");
      setDeniveleMax("");
    }

    if (nouveauType === "trail") {
      setAllureMin("");
      setAllureMax("");
    }

    appliquerFiltresRapides({
      type: nouveauType,
    });
  }

  function basculerContacts() {
    const nouvelleValeur = !avecSuivis;

    setAvecSuivis(nouvelleValeur);

    appliquerFiltresRapides({
      suivis: nouvelleValeur,
    });
  }

  // ------------------------------------------------
  // RECHERCHE
  // ------------------------------------------------

  function basculerGenre(genre: string) {
    setGenres((genresActuels) =>
      genresActuels.includes(genre)
        ? genresActuels.filter((item) => item !== genre)
        : [...genresActuels, genre],
    );
  }

  function reinitialiserFiltres() {
    setDistanceMin("");
    setDistanceMax("");

    setDeniveleMin("");
    setDeniveleMax("");

    setAllureMin("");
    setAllureMax("");

    setIntensite("");

    setTypeEntrainement("");

    setDureeMin("");
    setDureeMax("");

    setGenres([]);

    setModeInscription("");

    setMasquerCompletes(true);

    setMessage("");
  }

  // ------------------------------------------------
  // APPLICATION DES FILTRES
  // ------------------------------------------------

  function rechercher(event: FormEvent) {
    event.preventDefault();

    setMessage("");

    // ------------------------------------------------
    // LOCALISATION
    // ------------------------------------------------

    if (lieu.trim().length < 2) {
      setMessage("Indiquez un lieu de recherche.");

      return;
    }

    if (!localisation) {
      setMessage("Localisez le lieu saisi avant de lancer la recherche.");

      return;
    }

    if (
      !Number.isFinite(localisation.latitude) ||
      !Number.isFinite(localisation.longitude)
    ) {
      setMessage("Le centre de recherche est invalide.");

      return;
    }
    // ------------------------------------------------
    // DISTANCE
    // ------------------------------------------------

    const distanceMinNombre = nombreDepuisChamp(distanceMin);

    const distanceMaxNombre = nombreDepuisChamp(distanceMax);

    if (Number.isNaN(distanceMinNombre) || Number.isNaN(distanceMaxNombre)) {
      setMessage("La distance indiquée n'est pas valide.");

      return;
    }

    if (
      distanceMinNombre !== null &&
      distanceMaxNombre !== null &&
      distanceMinNombre > distanceMaxNombre
    ) {
      setMessage(
        "La distance minimale ne peut pas dépasser la distance maximale.",
      );

      return;
    }

    // ------------------------------------------------
    // TRAIL : DENIVELE
    // ------------------------------------------------

    let deniveleMinNombre: number | null = null;

    let deniveleMaxNombre: number | null = null;

    if (typeSortie === "trail") {
      deniveleMinNombre = nombreDepuisChamp(deniveleMin);

      deniveleMaxNombre = nombreDepuisChamp(deniveleMax);

      if (Number.isNaN(deniveleMinNombre) || Number.isNaN(deniveleMaxNombre)) {
        setMessage("Le dénivelé indiqué n'est pas valide.");

        return;
      }

      if (
        deniveleMinNombre !== null &&
        deniveleMaxNombre !== null &&
        deniveleMinNombre > deniveleMaxNombre
      ) {
        setMessage("Le dénivelé minimum ne peut pas dépasser le maximum.");

        return;
      }
    }

    // ------------------------------------------------
    // ROUTE : ALLURE
    // ------------------------------------------------

    let allureMinSecondes: number | null = null;

    let allureMaxSecondes: number | null = null;

    if (typeSortie === "route") {
      allureMinSecondes = allureVersSecondes(allureMin);

      allureMaxSecondes = allureVersSecondes(allureMax);

      if (Number.isNaN(allureMinSecondes) || Number.isNaN(allureMaxSecondes)) {
        setMessage("L'allure doit être indiquée sous la forme 5:30.");

        return;
      }

      if (
        allureMinSecondes !== null &&
        allureMaxSecondes !== null &&
        allureMinSecondes > allureMaxSecondes
      ) {
        setMessage("L'allure minimale ne peut pas dépasser l'allure maximale.");

        return;
      }
    }

    // ------------------------------------------------
    // DUREE
    // ------------------------------------------------

    const dureeMinNombre = nombreDepuisChamp(dureeMin);

    const dureeMaxNombre = nombreDepuisChamp(dureeMax);

    if (Number.isNaN(dureeMinNombre) || Number.isNaN(dureeMaxNombre)) {
      setMessage("La durée indiquée n'est pas valide.");

      return;
    }

    if (
      dureeMinNombre !== null &&
      dureeMaxNombre !== null &&
      dureeMinNombre > dureeMaxNombre
    ) {
      setMessage("La durée minimale ne peut pas dépasser la durée maximale.");

      return;
    }

    // ------------------------------------------------
    // CONSTRUCTION DE L'URL
    // ------------------------------------------------

    setLoading(true);

    // On conserve les paramètres qui ne font pas
    // partie des filtres, notamment la navigation
    // de date.
    const params = new URLSearchParams(searchParams.toString());

    const filtresAGerer = [
      "lieu",
      "rayon",
      "lat",
      "lon",
      "type",
      "distanceMin",
      "distanceMax",
      "deniveleMin",
      "deniveleMax",
      "allureMin",
      "allureMax",
      "intensite",
      "typeEntrainement",
      "dureeMin",
      "dureeMax",
      "genres",
      "modeInscription",
      "masquerCompletes",
      "suivis",
    ];

    for (const filtre of filtresAGerer) {
      params.delete(filtre);
    }

    // ------------------------------------------------
    // LOCALISATION
    // ------------------------------------------------

    params.set("lieu", lieu.trim());

    params.set("rayon", String(rayon));

    params.set("lat", String(localisation.latitude));

    params.set("lon", String(localisation.longitude));

    // ------------------------------------------------
    // TYPE DE SORTIE
    // ------------------------------------------------

    if (typeSortie) {
      params.set("type", typeSortie);
    }

    // ------------------------------------------------
    // DISTANCE
    // ------------------------------------------------

    if (distanceMinNombre !== null) {
      params.set("distanceMin", String(distanceMinNombre));
    }

    if (distanceMaxNombre !== null) {
      params.set("distanceMax", String(distanceMaxNombre));
    }

    // ------------------------------------------------
    // TRAIL : DENIVELE
    // ------------------------------------------------

    if (typeSortie === "trail") {
      if (deniveleMinNombre !== null) {
        params.set("deniveleMin", String(deniveleMinNombre));
      }

      if (deniveleMaxNombre !== null) {
        params.set("deniveleMax", String(deniveleMaxNombre));
      }
    }

    // ------------------------------------------------
    // ROUTE : ALLURE
    // ------------------------------------------------

    if (typeSortie === "route") {
      if (allureMinSecondes !== null) {
        params.set("allureMin", String(allureMinSecondes));
      }

      if (allureMaxSecondes !== null) {
        params.set("allureMax", String(allureMaxSecondes));
      }
    }

    // ------------------------------------------------
    // INTENSITE
    // ------------------------------------------------

    if (intensite) {
      params.set("intensite", intensite);
    }

    // ------------------------------------------------
    // TYPE D'ENTRAINEMENT
    // ------------------------------------------------

    if (typeEntrainement) {
      params.set("typeEntrainement", typeEntrainement);
    }

    // ------------------------------------------------
    // DUREE
    // ------------------------------------------------

    if (dureeMinNombre !== null) {
      params.set("dureeMin", String(dureeMinNombre));
    }

    if (dureeMaxNombre !== null) {
      params.set("dureeMax", String(dureeMaxNombre));
    }

    // ------------------------------------------------
    // GENRES
    // ------------------------------------------------

    if (genres.length > 0) {
      params.set("genres", genres.join(","));
    }

    // ------------------------------------------------
    // MODE D'INSCRIPTION
    // ------------------------------------------------

    if (modeInscription) {
      params.set("modeInscription", modeInscription);
    }

    // ------------------------------------------------
    // SORTIES COMPLETES
    // ------------------------------------------------

    params.set("masquerCompletes", masquerCompletes ? "1" : "0");

    // ------------------------------------------------
    // CONTACTS SUIVIS
    // ------------------------------------------------

    if (avecSuivis) {
      params.set("suivis", "1");
    }

    // ------------------------------------------------
    // NAVIGATION
    // ------------------------------------------------

    setFiltresOuverts(false);

    router.push(`/sorties?${params.toString()}`);

    setLoading(false);
  }

  // ------------------------------------------------
  // La souris ne scroll pas sur les champ de valeurs
  // ------------------------------------------------

  function empecherModificationMolette(
    event: React.WheelEvent<HTMLInputElement>,
  ) {
    event.currentTarget.blur();
  }
  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <form onSubmit={rechercher} className="relative mb-4 space-y-3">
      {/* ==================================================
        FILTRES PRINCIPAUX — TOUJOURS VISIBLES
    ================================================== */}

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          {/* TYPE DE TERRAIN */}

          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
            <ToggleButton
              type="button"
              pressed={typeSortie === ""}
              onClick={() => choisirType("")}
            >
              Tous
            </ToggleButton>

            <ToggleButton
              type="button"
              pressed={typeSortie === "route"}
              onClick={() => choisirType("route")}
            >
              Route
            </ToggleButton>

            <ToggleButton
              type="button"
              pressed={typeSortie === "trail"}
              onClick={() => choisirType("trail")}
            >
              Trail
            </ToggleButton>
          </div>

          {/* CONTACTS */}

          <div className="shrink-0 border-l border-border pl-3">
            <ToggleButton
              type="button"
              pressed={avecSuivis}
              onClick={basculerContacts}
              aria-label="Mes contacts uniquement"
              className="min-h-10"
            >
              <span className="sm:hidden">Contacts</span>

              <span className="hidden sm:inline">Mes contacts uniquement</span>
            </ToggleButton>
          </div>
        </div>

        {/* LOCALISATION + RAYON */}

        <SelecteurLieu
          lieu={lieu}
          onLieuChange={setLieu}
          localisation={localisation}
          onLocalisationChange={setLocalisation}
          onValidation={(localisationValidee) => {
            appliquerFiltresRapides({
              lieuRecherche: lieu,
              localisationRecherche: localisationValidee,
              rayonRecherche: rayon,
            });
          }}
          libelle="Lieu de recherche"
          placeholder="Chambéry"
          resumeSupplementaire={
            <>
              {" · "}
              {rayon} km
            </>
          }
          contenuSupplementaire={
            <SelecteurRayon rayonKm={rayon} onRayonChange={setRayon} />
          }
          rayonCarteKm={rayon}
          aideCarte="
          Cliquez sur la carte ou déplacez le point
          pour modifier le centre de la recherche.
        "
        />
      </div>

      {/* ==================================================
        FILTRES AVANCÉS
    ================================================== */}

      <FilterDrawer
        open={filtresOuverts}
        onOpenChange={setFiltresOuverts}
        title="Filtres avancés"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={reinitialiserFiltres}
              disabled={loading}
            >
              Réinitialiser
            </Button>

            <Button type="submit" disabled={loading} className="min-w-28">
              {loading ? "Recherche..." : "Appliquer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* ==================================================
            CARACTÉRISTIQUES SPORTIVES
        ================================================== */}

          <div className="space-y-4">
            {/* DISTANCE */}

            <div>
              <label className="mb-2 block text-sm font-medium">Distance</label>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Min. km"
                  value={distanceMin}
                  onChange={(event) => setDistanceMin(event.target.value)}
                  onWheel={empecherModificationMolette}
                />

                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Max. km"
                  value={distanceMax}
                  onChange={(event) => setDistanceMax(event.target.value)}
                  onWheel={empecherModificationMolette}
                />
              </div>
            </div>

            {/* ROUTE : ALLURE */}

            {typeSortie === "route" && (
              <div>
                <label className="mb-2 block text-sm font-medium">Allure</label>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Min. 4:30"
                    value={allureMin}
                    onChange={(event) => setAllureMin(event.target.value)}
                  />

                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Max. 6:00"
                    value={allureMax}
                    onChange={(event) => setAllureMax(event.target.value)}
                  />
                </div>

                <p className="mt-1 text-xs text-muted-foreground">min/km</p>
              </div>
            )}

            {/* TRAIL : DÉNIVELÉ */}

            {typeSortie === "trail" && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Dénivelé positif
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Min. D+"
                    value={deniveleMin}
                    onChange={(event) => setDeniveleMin(event.target.value)}
                    onWheel={empecherModificationMolette}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Max. D+"
                    value={deniveleMax}
                    onChange={(event) => setDeniveleMax(event.target.value)}
                    onWheel={empecherModificationMolette}
                  />
                </div>
              </div>
            )}

            {/* INTENSITÉ */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Intensité
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["tranquille", "Tranquille"],
                  ["moderee", "Modérée"],
                  ["soutenue", "Soutenue"],
                ].map(([valeur, texte]) => (
                  <ToggleButton
                    key={valeur}
                    type="button"
                    pressed={intensite === valeur}
                    onClick={() =>
                      setIntensite(
                        intensite === valeur ? "" : (valeur as Intensite),
                      )
                    }
                    size="sm"
                  >
                    {texte}
                  </ToggleButton>
                ))}
              </div>
            </div>
          </div>

          {/* ==================================================
            FILTRES COMPLÉMENTAIRES
        ================================================== */}

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold">Filtres complémentaires</h3>

            {/* TYPE D'ENTRAÎNEMENT */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Type d&apos;entraînement
              </label>

              <Select
                value={typeEntrainement}
                onChange={(event) => setTypeEntrainement(event.target.value)}
              >
                <option value="">Tous</option>

                <option value="endurance_fondamentale">
                  Endurance fondamentale
                </option>

                <option value="sortie_longue">Sortie longue</option>

                <option value="tempo_seuil">Tempo / seuil</option>

                <option value="fractionne">Fractionné</option>

                <option value="cotes">Côtes</option>

                <option value="recuperation">Récupération</option>

                <option value="libre">Libre</option>
              </Select>
            </div>

            {/* DURÉE */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Durée estimée
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min. minutes"
                  value={dureeMin}
                  onChange={(event) => setDureeMin(event.target.value)}
                  onWheel={empecherModificationMolette}
                />

                <Input
                  type="number"
                  min="0"
                  placeholder="Max. minutes"
                  value={dureeMax}
                  onChange={(event) => setDureeMax(event.target.value)}
                  onWheel={empecherModificationMolette}
                />
              </div>
            </div>
          </div>

          {/* ==================================================
            PARTICIPATION
        ================================================== */}

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold">Participation</h3>

            {/* GENRES */}

            <div>
              <p className="mb-2 text-sm font-medium">Genres autorisés</p>

              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={genres.includes("homme")}
                    onCheckedChange={() => basculerGenre("homme")}
                  />
                  Homme
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={genres.includes("femme")}
                    onCheckedChange={() => basculerGenre("femme")}
                  />
                  Femme
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={genres.includes("autre")}
                    onCheckedChange={() => basculerGenre("autre")}
                  />
                  Autre
                </label>
              </div>
            </div>

            {/* MODE D'INSCRIPTION */}

            <div>
              <p className="mb-2 text-sm font-medium">
                Mode d&apos;inscription
              </p>

              <Select
                value={modeInscription}
                onChange={(event) => setModeInscription(event.target.value)}
              >
                <option value="">Tous</option>

                <option value="automatique">Validation automatique</option>

                <option value="validation">Sur acceptation</option>
              </Select>
            </div>

            {/* SORTIES COMPLÈTES */}

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={masquerCompletes}
                onCheckedChange={(checked) =>
                  setMasquerCompletes(checked === true)
                }
              />
              Masquer les sorties complètes
            </label>
          </div>
        </div>
      </FilterDrawer>

      {/* MESSAGE */}

      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
  );
}
