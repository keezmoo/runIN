import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    periode?: string;
    type?: string;
    tri?: string;
    page?: string;
    parPage?: string;
  }>;
};

type SortieAdmin = {
  sortie_id: string;
  titre: string;

  organisateur_id: string;
  organisateur_nom: string;

  date_heure_depart: string;
  lieu_depart: string;

  type_sortie: string;
  statut: string;

  nombre_max_participants: number;
  nombre_participants: number;
  demandes_en_attente: number;

  date_creation: string;

  total_resultats: number;
};

function afficherDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

function nombrePositif(valeur: string | undefined, defaut: number) {
  const nombre = Number(valeur);

  if (!Number.isInteger(nombre) || nombre < 1) {
    return defaut;
  }

  return nombre;
}

export default async function AdminSortiesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ------------------------------------------------
  // FILTRES
  // ------------------------------------------------

  const recherche = params.recherche?.trim() ?? "";

  const statutsAutorises = ["tous", "planifiee", "annulee"];

  const statut = statutsAutorises.includes(params.statut ?? "")
    ? params.statut!
    : "tous";

  const periodesAutorisees = ["toutes", "a_venir", "passees"];

  const periode = periodesAutorisees.includes(params.periode ?? "")
    ? params.periode!
    : "toutes";

  const typesAutorises = ["tous", "route", "trail"];

  const type = typesAutorises.includes(params.type ?? "")
    ? params.type!
    : "tous";

  const trisAutorises = ["date_desc", "date_asc", "creation_desc"];

  const tri = trisAutorises.includes(params.tri ?? "")
    ? params.tri!
    : "date_desc";

  const valeursParPage = [25, 50, 100];

  const parPageDemande = nombrePositif(params.parPage, 25);

  const parPage = valeursParPage.includes(parPageDemande) ? parPageDemande : 25;

  const page = nombrePositif(params.page, 1);

  // ------------------------------------------------
  // DONNÉES
  // ------------------------------------------------

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_lister_sorties", {
    p_recherche: recherche || null,

    p_statut: statut,

    p_periode: periode,

    p_type: type,

    p_tri: tri,

    p_page: page,

    p_limite: parPage,
  });

  if (error) {
    console.error("Erreur liste sorties admin :", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return (
      <main className="mx-auto max-w-7xl p-6">
        <p className="text-red-500">Impossible de charger les sorties.</p>
      </main>
    );
  }

  const sorties = (data ?? []) as SortieAdmin[];

  // URL demandant une page inexistante.
  if (page > 1 && sorties.length === 0) {
    const query = new URLSearchParams();

    if (recherche) {
      query.set("recherche", recherche);
    }

    query.set("statut", statut);

    query.set("periode", periode);

    query.set("type", type);

    query.set("tri", tri);

    query.set("parPage", String(parPage));

    redirect(`/admin/sorties?${query.toString()}`);
  }

  const totalResultats = sorties[0]?.total_resultats ?? 0;

  const nombrePages = Math.max(1, Math.ceil(totalResultats / parPage));

  const premiereLigne = totalResultats === 0 ? 0 : (page - 1) * parPage + 1;

  const derniereLigne = Math.min(page * parPage, totalResultats);

  function urlPage(nouvellePage: number) {
    const query = new URLSearchParams();

    if (recherche) {
      query.set("recherche", recherche);
    }

    query.set("statut", statut);

    query.set("periode", periode);

    query.set("type", type);

    query.set("tri", tri);

    query.set("parPage", String(parPage));

    query.set("page", String(nouvellePage));

    return `/admin/sorties?${query.toString()}`;
  }

  return (
    <main
      className="
                mx-auto
                max-w-7xl
                space-y-6
                p-6
            "
    >
      {/* EN-TÊTE */}

      <div>
        <Link
          href="/admin"
          className="
                        text-sm
                        text-gray-500
                        hover:underline
                    "
        >
          ← Administration
        </Link>

        <h1
          className="
                        mt-3
                        text-2xl
                        font-bold
                    "
        >
          Sorties
        </h1>

        <p
          className="
                        mt-1
                        text-sm
                        text-gray-500
                    "
        >
          {totalResultats} sortie
          {totalResultats > 1 ? "s" : ""} correspondant aux filtres.
        </p>
      </div>

      {/* FILTRES */}

      <form
        method="get"
        className="
                    grid
                    gap-3
                    rounded-xl
                    border
                    p-4
                    md:grid-cols-2
                    xl:grid-cols-6
                "
      >
        <input
          type="search"
          name="recherche"
          defaultValue={recherche}
          placeholder="Titre, lieu ou organisateur"
          maxLength={100}
          className="
                        min-w-0
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                        xl:col-span-2
                    "
        />

        <select
          name="statut"
          defaultValue={statut}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="tous">Tous les statuts</option>

          <option value="planifiee">Planifiées</option>

          <option value="annulee">Annulées</option>
        </select>

        <select
          name="periode"
          defaultValue={periode}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="toutes">Toutes les dates</option>

          <option value="a_venir">À venir</option>

          <option value="passees">Passées</option>
        </select>

        <select
          name="type"
          defaultValue={type}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="tous">Route + Trail</option>

          <option value="route">Route</option>

          <option value="trail">Trail</option>
        </select>

        <button
          type="submit"
          className="
                        rounded-lg
                        bg-[#8ED8B6]
                        px-4
                        py-2
                        font-medium
                        text-black
                    "
        >
          Appliquer
        </button>

        <select
          name="tri"
          defaultValue={tri}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="date_desc">Date : plus éloignée</option>

          <option value="date_asc">Date : plus proche</option>

          <option value="creation_desc">Créées récemment</option>
        </select>

        <input type="hidden" name="parPage" value={parPage} />
      </form>

      {/* TABLEAU */}

      <div
        className="
                    overflow-x-auto
                    rounded-xl
                    border
                "
      >
        <table
          className="
                        w-full
                        min-w-[1100px]
                        text-left
                        text-sm
                    "
        >
          <thead
            className="
                            border-b
                            bg-zinc-900
                        "
          >
            <tr>
              <th className="px-4 py-3">Sortie</th>

              <th className="px-4 py-3">Organisateur</th>

              <th className="px-4 py-3">Date</th>

              <th className="px-4 py-3">Type</th>

              <th className="px-4 py-3">Statut</th>

              <th className="px-4 py-3 text-center">Participants</th>

              <th className="px-4 py-3 text-center">Demandes</th>
            </tr>
          </thead>

          <tbody>
            {sorties.map((sortie) => (
              <tr
                key={sortie.sortie_id}
                className="
                                        border-b
                                        align-top
                                        last:border-b-0
                                    "
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/sorties/${sortie.sortie_id}`}
                    className="
                                                font-medium
                                                hover:underline
                                            "
                  >
                    {sortie.titre}
                  </Link>

                  <p
                    className="
                                                mt-1
                                                text-xs
                                                text-gray-500
                                            "
                  >
                    {sortie.lieu_depart}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <Link
                    href={`/admin/utilisateurs/${sortie.organisateur_id}`}
                    className="
                                                hover:underline
                                            "
                  >
                    {sortie.organisateur_nom}
                  </Link>
                </td>

                <td
                  className="
                                            whitespace-nowrap
                                            px-4
                                            py-3
                                        "
                >
                  {afficherDate(sortie.date_heure_depart)}
                </td>

                <td className="px-4 py-3">
                  {sortie.type_sortie === "trail" ? "Trail" : "Route"}
                </td>

                <td className="px-4 py-3">
                  <span
                    className="
                                                rounded-full
                                                border
                                                px-2
                                                py-1
                                                text-xs
                                            "
                  >
                    {sortie.statut === "annulee"
                      ? "Annulée"
                      : new Date(sortie.date_heure_depart) < new Date()
                        ? "Terminée"
                        : "Planifiée"}
                  </span>
                </td>

                <td
                  className="
                                            px-4
                                            py-3
                                            text-center
                                        "
                >
                  {sortie.nombre_participants}
                  {" / "}
                  {sortie.nombre_max_participants}
                </td>

                <td
                  className="
                                            px-4
                                            py-3
                                            text-center
                                        "
                >
                  {sortie.demandes_en_attente}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorties.length === 0 && (
          <div
            className="
                            p-8
                            text-center
                            text-sm
                            text-gray-500
                        "
          >
            Aucune sortie trouvée.
          </div>
        )}
      </div>

      {/* PAGINATION */}

      <div
        className="
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                "
      >
        <p className="text-sm text-gray-500">
          {premiereLigne}
          {" – "}
          {derniereLigne}
          {" sur "}
          {totalResultats}
        </p>

        <div
          className="
                        flex
                        flex-wrap
                        items-center
                        gap-3
                    "
        >
          <form method="get">
            {recherche && (
              <input type="hidden" name="recherche" value={recherche} />
            )}

            <input type="hidden" name="statut" value={statut} />

            <input type="hidden" name="periode" value={periode} />

            <input type="hidden" name="type" value={type} />

            <input type="hidden" name="tri" value={tri} />

            <label
              className="
                                flex
                                items-center
                                gap-2
                                text-sm
                            "
            >
              Afficher
              <select
                name="parPage"
                defaultValue={String(parPage)}
                className="
                                    rounded
                                    border
                                    bg-background
                                    px-2
                                    py-1
                                "
              >
                <option value="25">25</option>

                <option value="50">50</option>

                <option value="100">100</option>
              </select>
              <button
                type="submit"
                className="
                                    rounded
                                    border
                                    px-2
                                    py-1
                                "
              >
                OK
              </button>
            </label>
          </form>

          <div
            className="
                            flex
                            items-center
                            gap-2
                        "
          >
            {page > 1 ? (
              <Link
                href={urlPage(page - 1)}
                className="
                                    rounded
                                    border
                                    px-3
                                    py-1.5
                                    text-sm
                                "
              >
                ←
              </Link>
            ) : (
              <span
                className="
                                    rounded
                                    border
                                    px-3
                                    py-1.5
                                    text-sm
                                    opacity-30
                                "
              >
                ←
              </span>
            )}

            <span className="text-sm">
              Page {page} sur {nombrePages}
            </span>

            {page < nombrePages ? (
              <Link
                href={urlPage(page + 1)}
                className="
                                    rounded
                                    border
                                    px-3
                                    py-1.5
                                    text-sm
                                "
              >
                →
              </Link>
            ) : (
              <span
                className="
                                    rounded
                                    border
                                    px-3
                                    py-1.5
                                    text-sm
                                    opacity-30
                                "
              >
                →
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
