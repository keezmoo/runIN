"use client";

import { FormEvent, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

type TypeSortie = "" | "route" | "trail";

type Intensite = "" | "tranquille" | "moderee" | "soutenue";

type FiltresSortiesProps = {
  lieuActuel: string;
  rayonActuel: number;
  typeActuel: string;
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
}: FiltresSortiesProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  // ------------------------------------------------
  // NIVEAU D'AFFICHAGE
  // ------------------------------------------------

  const niveauInitial: 1 | 2 | 3 =
    searchParams.has("typeEntrainement") ||
    searchParams.has("dureeMin") ||
    searchParams.has("dureeMax") ||
    searchParams.has("genres") ||
    searchParams.has("modeInscription") ||
    searchParams.has("masquerCompletes")
      ? 3
      : searchParams.has("distanceMin") ||
          searchParams.has("distanceMax") ||
          searchParams.has("deniveleMin") ||
          searchParams.has("deniveleMax") ||
          searchParams.has("allureMin") ||
          searchParams.has("allureMax") ||
          searchParams.has("intensite")
        ? 2
        : 1;

  const [niveauFiltres, setNiveauFiltres] = useState<1 | 2 | 3>(niveauInitial);

  // ------------------------------------------------
  // FILTRES PRINCIPAUX
  // ------------------------------------------------

  const [typeSortie, setTypeSortie] = useState<TypeSortie>(
    typeActuel === "route" || typeActuel === "trail" ? typeActuel : "",
  );

  const [lieu, setLieu] = useState(lieuActuel);

  const rayonInitial = Math.min(20, Math.max(1, Number(rayonActuel) || 10));

  const [rayon, setRayon] = useState(rayonInitial);

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
    searchParams.get("masquerCompletes") === "1",
  );

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

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
    setTypeSortie("");

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

    setMasquerCompletes(false);

    setMessage("");
  }

  async function rechercher(event: FormEvent) {
    event.preventDefault();

    setMessage("");

    if (lieu.trim().length < 2) {
      setMessage("Indiquez un lieu de recherche.");

      return;
    }

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

    setLoading(true);

    try {
      const reponse = await fetch(
        `/api/geocode?q=${encodeURIComponent(lieu.trim())}`,
      );

      if (!reponse.ok) {
        setMessage("Impossible de trouver ce lieu.");

        return;
      }

      const localisation = await reponse.json();

      // On part des paramètres existants
      // afin de conserver notamment la
      // navigation de date.
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
      ];

      for (const filtre of filtresAGerer) {
        params.delete(filtre);
      }

      params.set("lieu", lieu.trim());

      params.set("rayon", String(rayon));

      params.set("lat", String(localisation.latitude));

      params.set("lon", String(localisation.longitude));

      if (typeSortie) {
        params.set("type", typeSortie);
      }

      if (distanceMinNombre !== null) {
        params.set("distanceMin", String(distanceMinNombre));
      }

      if (distanceMaxNombre !== null) {
        params.set("distanceMax", String(distanceMaxNombre));
      }

      if (typeSortie === "trail") {
        if (deniveleMinNombre !== null) {
          params.set("deniveleMin", String(deniveleMinNombre));
        }

        if (deniveleMaxNombre !== null) {
          params.set("deniveleMax", String(deniveleMaxNombre));
        }
      }

      if (typeSortie === "route") {
        if (allureMinSecondes !== null) {
          params.set("allureMin", String(allureMinSecondes));
        }

        if (allureMaxSecondes !== null) {
          params.set("allureMax", String(allureMaxSecondes));
        }
      }

      if (intensite) {
        params.set("intensite", intensite);
      }

      if (typeEntrainement) {
        params.set("typeEntrainement", typeEntrainement);
      }

      if (dureeMinNombre !== null) {
        params.set("dureeMin", String(dureeMinNombre));
      }

      if (dureeMaxNombre !== null) {
        params.set("dureeMax", String(dureeMaxNombre));
      }

      if (genres.length > 0) {
        params.set("genres", genres.join(","));
      }

      if (modeInscription) {
        params.set("modeInscription", modeInscription);
      }

      if (masquerCompletes) {
        params.set("masquerCompletes", "1");
      }

      router.push(`/sorties?${params.toString()}`);
    } catch (erreur) {
      console.error("Erreur recherche sorties :", erreur);

      setMessage("Impossible d'effectuer la recherche.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <form onSubmit={rechercher} className="mb-4 space-y-4">
      {/* SPORT */}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => choisirType("")}
          className={
            typeSortie === ""
              ? "rounded border-2 px-3 py-2 font-semibold"
              : "rounded border px-3 py-2"
          }
        >
          Tous
        </button>

        <button
          type="button"
          onClick={() => choisirType("route")}
          className={
            typeSortie === "route"
              ? "rounded border-2 px-3 py-2 font-semibold"
              : "rounded border px-3 py-2"
          }
        >
          Route
        </button>

        <button
          type="button"
          onClick={() => choisirType("trail")}
          className={
            typeSortie === "trail"
              ? "rounded border-2 px-3 py-2 font-semibold"
              : "rounded border px-3 py-2"
          }
        >
          Trail
        </button>
      </div>

      {/* LIEU */}

      <div>
        <label className="mb-2 block text-sm font-medium">Lieu</label>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={lieu}
            onChange={(event) => setLieu(event.target.value)}
            className="
                min-w-0
                flex-1
                rounded
                border
                p-2
            "
            placeholder="Ville ou lieu"
          />

          <button
            type="button"
            onClick={() => setNiveauFiltres(niveauFiltres === 3 ? 1 : 3)}
            className="
                shrink-0
                whitespace-nowrap
                text-sm
                font-medium
            "
          >
            {niveauFiltres === 3 ? "< Fermer" : "Autres filtres >"}
          </button>
        </div>
      </div>

      {/* RAYON */}

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span>Rayon</span>

          <span>{rayon} km</span>
        </div>

        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={rayon}
          onChange={(event) => setRayon(Number(event.target.value))}
          className="w-full"
        />

        <div className="flex justify-between text-xs text-gray-500">
          <span>1 km</span>
          <span>20 km</span>
        </div>
      </div>

      {/* NIVEAU SPORTIF */}

      {niveauFiltres >= 2 && (
        <div className="space-y-4 border-t pt-4">
          {niveauFiltres === 3 && (
            <h3 className="font-semibold">Caractéristiques sportives</h3>
          )}

          {/* DISTANCE */}

          <div>
            <label className="mb-2 block text-sm font-medium">Distance</label>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Min. km"
                value={distanceMin}
                onChange={(event) => setDistanceMin(event.target.value)}
                className="rounded border p-2"
              />

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Max. km"
                value={distanceMax}
                onChange={(event) => setDistanceMax(event.target.value)}
                className="rounded border p-2"
              />
            </div>
          </div>

          {/* ROUTE : ALLURE */}

          {typeSortie === "route" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Allure</label>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min. 4:30"
                  value={allureMin}
                  onChange={(event) => setAllureMin(event.target.value)}
                  className="rounded border p-2"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Max. 6:00"
                  value={allureMax}
                  onChange={(event) => setAllureMax(event.target.value)}
                  className="rounded border p-2"
                />
              </div>

              <p className="mt-1 text-xs text-gray-500">min/km</p>
            </div>
          )}

          {/* TRAIL : D+ */}

          {typeSortie === "trail" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Dénivelé positif
              </label>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Min. D+"
                  value={deniveleMin}
                  onChange={(event) => setDeniveleMin(event.target.value)}
                  className="rounded border p-2"
                />

                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Max. D+"
                  value={deniveleMax}
                  onChange={(event) => setDeniveleMax(event.target.value)}
                  className="rounded border p-2"
                />
              </div>
            </div>
          )}

          {/* INTENSITÉ */}

          <div>
            <label className="mb-2 block text-sm font-medium">Intensité</label>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["tranquille", "Tranquille"],
                ["moderee", "Modérée"],
                ["soutenue", "Soutenue"],
              ].map(([valeur, texte]) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() =>
                    setIntensite(
                      intensite === valeur ? "" : (valeur as Intensite),
                    )
                  }
                  className={
                    intensite === valeur
                      ? "rounded border-2 px-2 py-2 text-sm font-semibold"
                      : "rounded border px-2 py-2 text-sm"
                  }
                >
                  {texte}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {niveauFiltres === 3 && (
        <div className="space-y-5">
          <div className="border-t pt-4">
            <h3 className="mb-4 font-semibold">Filtres complémentaires</h3>

            {/* TYPE D'ENTRAÎNEMENT */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Type d&apos;entraînement
              </label>

              <select
                value={typeEntrainement}
                onChange={(event) => setTypeEntrainement(event.target.value)}
                className="w-full rounded border p-2"
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
              </select>
            </div>

            {/* DURÉE */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Durée estimée
              </label>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  placeholder="Min. minutes"
                  value={dureeMin}
                  onChange={(event) => setDureeMin(event.target.value)}
                  className="rounded border p-2"
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Max. minutes"
                  value={dureeMax}
                  onChange={(event) => setDureeMax(event.target.value)}
                  className="rounded border p-2"
                />
              </div>
            </div>
          </div>

          {/* PARTICIPATION */}

          <div className="border-t pt-4">
            <h4 className="mb-3 font-semibold">Participation</h4>

            {/* GENRES */}

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">Genres autorisés</p>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genres.includes("homme")}
                    onChange={() => basculerGenre("homme")}
                  />
                  Homme
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genres.includes("femme")}
                    onChange={() => basculerGenre("femme")}
                  />
                  Femme
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genres.includes("autre")}
                    onChange={() => basculerGenre("autre")}
                  />
                  Autre
                </label>
              </div>
            </div>

            {/* MODE D'INSCRIPTION */}

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">
                Mode d&apos;inscription
              </p>

              <select
                value={modeInscription}
                onChange={(event) => setModeInscription(event.target.value)}
                className="w-full rounded border p-2"
              >
                <option value="">Tous</option>

                <option value="automatique">Validation automatique</option>

                <option value="validation">Sur acceptation</option>
              </select>
            </div>

            {/* SORTIES COMPLÈTES */}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={masquerCompletes}
                onChange={(event) => setMasquerCompletes(event.target.checked)}
              />
              Masquer les sorties complètes
            </label>
          </div>
        </div>
      )}

      {/* RECHERCHER */}

      <div
        className="
        flex
        flex-col
        items-center
        gap-2
        pt-2
    "
      >
        <button
          type="button"
          onClick={() => setNiveauFiltres(niveauFiltres === 1 ? 2 : 1)}
          className="
            flex
            h-9
            w-16
            items-center
            justify-center
            rounded
            text-2xl
            font-bold
            leading-none
        "
          aria-label={
            niveauFiltres === 1
              ? "Afficher les filtres sportifs"
              : "Réduire les filtres"
          }
        >
          {niveauFiltres === 1 ? "▼" : "▲"}
        </button>

        <div className="flex items-center gap-3">
          {niveauFiltres === 3 && (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              disabled={loading}
              className="
                rounded
                border
                px-4
                py-2
                text-sm
            "
            >
              Réinitialiser
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
            rounded
            border
            px-6
            py-2
            font-medium00
        "
          >
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
