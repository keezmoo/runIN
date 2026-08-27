import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    recherche?: string;
    action?: string;
    page?: string;
    parPage?: string;
  }>;
};

type JournalAdmin = {
  journal_id: string;
  action: string;

  acteur_id: string | null;
  acteur_nom: string | null;

  utilisateur_cible_id: string | null;
  utilisateur_cible_nom: string | null;

  sanction_id: string | null;

  details: Record<string, unknown> | null;

  date_action: string;

  total_resultats: number;
};

function afficherDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(date));
}

function afficherAction(action: string) {
  switch (action) {
    case "suspension_utilisateur":
      return "Suspension";

    case "bannissement_utilisateur":
      return "Bannissement";

    case "levee_sanction_utilisateur":
      return "Levée de sanction";

    case "modification_role_utilisateur":
      return "Modification de rôle";

    case "annulation_sortie_administrative":
      return "Annulation de sortie";

    case "suppression_sortie_administrative":
      return "Suppression de sortie";

    case "prise_en_charge_signalement":
      return "Prise en charge d'un signalement";

    case "traitement_signalement":
      return "Traitement d'un signalement";

    case "rejet_signalement":
      return "Rejet d'un signalement";

    default:
      return action;
  }
}

function convertirTexte(valeur: unknown) {
  if (typeof valeur === "string") {
    return valeur;
  }

  if (typeof valeur === "number") {
    return String(valeur);
  }

  return null;
}

function afficherDetails(entree: JournalAdmin) {
  const details = entree.details ?? {};

  if (entree.action === "modification_role_utilisateur") {
    const ancienRole = convertirTexte(details.ancien_role);

    const nouveauRole = convertirTexte(details.nouveau_role);

    if (ancienRole && nouveauRole) {
      return `${ancienRole} → ${nouveauRole}`;
    }
  }

  const motif = convertirTexte(details.motif);

  if (motif) {
    return motif;
  }

  return "—";
}

function nombrePositif(valeur: string | undefined, defaut: number) {
  const nombre = Number(valeur);

  if (!Number.isInteger(nombre) || nombre < 1) {
    return defaut;
  }

  return nombre;
}

export default async function JournalAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ------------------------------------------------
  // PARAMÈTRES
  // ------------------------------------------------

  const recherche = params.recherche?.trim() ?? "";

  const actionsAutorisees = [
    "tous",
    "suspension_utilisateur",
    "bannissement_utilisateur",
    "levee_sanction_utilisateur",
    "modification_role_utilisateur",
    "annulation_sortie_administrative",
    "suppression_sortie_administrative",
    "prise_en_charge_signalement",
    "traitement_signalement",
    "rejet_signalement",
  ];

  const action = actionsAutorisees.includes(params.action ?? "")
    ? params.action!
    : "tous";

  const valeursParPage = [25, 50, 100];

  const parPageDemande = nombrePositif(params.parPage, 25);

  const parPage = valeursParPage.includes(parPageDemande) ? parPageDemande : 25;

  const page = nombrePositif(params.page, 1);

  // ------------------------------------------------
  // DONNÉES
  // ------------------------------------------------

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_lister_journal", {
    p_recherche: recherche || null,

    p_action: action,

    p_page: page,

    p_limite: parPage,
  });

  if (error) {
    console.error("Erreur journal administration :", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return (
      <main
        className="
                    mx-auto
                    max-w-6xl
                    p-6
                "
      >
        <p className="text-red-500">
          Impossible de charger le journal d&apos;administration.
        </p>
      </main>
    );
  }

  const journal = (data ?? []) as JournalAdmin[];

  if (page > 1 && journal.length === 0) {
    const query = new URLSearchParams();

    if (recherche) {
      query.set("recherche", recherche);
    }

    query.set("action", action);

    query.set("parPage", String(parPage));

    redirect(`/admin/journal?${query.toString()}`);
  }

  const totalResultats = journal[0]?.total_resultats ?? 0;

  const nombrePages = Math.max(1, Math.ceil(totalResultats / parPage));

  const premiereLigne = totalResultats === 0 ? 0 : (page - 1) * parPage + 1;

  const derniereLigne = Math.min(page * parPage, totalResultats);

  function urlPage(nouvellePage: number) {
    const query = new URLSearchParams();

    if (recherche) {
      query.set("recherche", recherche);
    }

    query.set("action", action);

    query.set("parPage", String(parPage));

    query.set("page", String(nouvellePage));

    return `/admin/journal?${query.toString()}`;
  }

  return (
    <main
      className="
                mx-auto
                max-w-6xl
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
          Journal d&apos;administration
        </h1>

        <p
          className="
                        mt-1
                        text-sm
                        text-gray-500
                    "
        >
          Historique des actions sensibles réalisées depuis
          l&apos;administration.
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
                    md:grid-cols-4
                "
      >
        <input
          type="search"
          name="recherche"
          defaultValue={recherche}
          placeholder="Administrateur ou utilisateur"
          maxLength={100}
          className="
                        min-w-0
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                        md:col-span-2
                    "
        />

        <select
          name="action"
          defaultValue={action}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="tous">Toutes les actions</option>

          <option value="suspension_utilisateur">Suspensions</option>

          <option value="bannissement_utilisateur">Bannissements</option>

          <option value="levee_sanction_utilisateur">Levées de sanction</option>

          <option value="modification_role_utilisateur">
            Modifications de rôle
          </option>

          <option value="annulation_sortie_administrative">
            Annulations de sorties
          </option>

          <option value="suppression_sortie_administrative">
            Suppressions de sorties
          </option>

          <option value="prise_en_charge_signalement">
            Prise en charge d'un signalement
          </option>

          <option value="traitement_signalement">
            Traitement d'un signalement
          </option>

          <option value="rejet_signalement">Rejet d'un signalement</option>
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
                        min-w-[1000px]
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
              <th className="px-4 py-3">Date</th>

              <th className="px-4 py-3">Administrateur</th>

              <th className="px-4 py-3">Action</th>

              <th className="px-4 py-3">Utilisateur concerné</th>

              <th className="px-4 py-3">Détails</th>
            </tr>
          </thead>

          <tbody>
            {journal.map((entree) => (
              <tr
                key={entree.journal_id}
                className="
                                        border-b
                                        align-top
                                        last:border-b-0
                                    "
              >
                <td
                  className="
                                            whitespace-nowrap
                                            px-4
                                            py-3
                                            text-gray-400
                                        "
                >
                  {afficherDate(entree.date_action)}
                </td>

                <td className="px-4 py-3">
                  {entree.acteur_id ? (
                    <Link
                      href={`/admin/utilisateurs/${entree.acteur_id}`}
                      className="
                                                    font-medium
                                                    hover:underline
                                                "
                    >
                      {entree.acteur_nom ?? "Compte supprimé"}
                    </Link>
                  ) : (
                    <span className="text-gray-500">Compte supprimé</span>
                  )}
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
                    {afficherAction(entree.action)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {entree.utilisateur_cible_id ? (
                    <Link
                      href={`/admin/utilisateurs/${entree.utilisateur_cible_id}`}
                      className="
                                                    font-medium
                                                    hover:underline
                                                "
                    >
                      {entree.utilisateur_cible_nom ?? "Compte supprimé"}
                    </Link>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>

                <td
                  className="
                                            max-w-md
                                            px-4
                                            py-3
                                            text-gray-400
                                        "
                >
                  {afficherDetails(entree)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {journal.length === 0 && (
          <div
            className="
                            p-8
                            text-center
                            text-sm
                            text-gray-500
                        "
          >
            Aucune action administrative trouvée.
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

            <input type="hidden" name="action" value={action} />

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
