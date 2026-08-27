import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    statut?: string;
    type?: string;
    motif?: string;
    recherche?: string;
    page?: string;
    parPage?: string;
  }>;
};

type Signalement = {
  signalement_id: string;

  type_cible: string;
  cible_id: string;
  cible_libelle: string;
  cible_utilisateur_id: string | null;

  signaleur_id: string | null;

  signaleur_nom: string | null;

  motif: string;

  commentaire: string | null;

  statut: string;

  assigne_a: string | null;

  assigne_nom: string | null;

  date_signalement: string;

  total_resultats: number;
};

function afficherMotif(motif: string) {
  switch (motif) {
    case "spam":
      return "Spam";

    case "harcelement":
      return "Harcèlement";

    case "contenu_inapproprie":
      return "Contenu inapproprié";

    case "faux_profil":
      return "Faux profil";

    case "comportement_dangereux":
      return "Comportement dangereux";

    default:
      return "Autre";
  }
}

function afficherStatut(statut: string) {
  switch (statut) {
    case "ouvert":
      return "Ouvert";

    case "en_cours":
      return "En cours";

    case "traite":
      return "Traité";

    case "rejete":
      return "Rejeté";

    default:
      return statut;
  }
}

function afficherDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

function entierPositif(valeur: string | undefined, defaut: number) {
  const nombre = Number(valeur);

  if (!Number.isInteger(nombre) || nombre < 1) {
    return defaut;
  }

  return nombre;
}

export default async function SignalementsAdminPage({ searchParams }: Props) {
  const params = await searchParams;

  const statuts = [
    "a_traiter",
    "tous",
    "ouvert",
    "en_cours",
    "traite",
    "rejete",
  ];

  const types = ["tous", "profil", "sortie"];

  const motifs = [
    "tous",
    "spam",
    "harcelement",
    "contenu_inapproprie",
    "faux_profil",
    "comportement_dangereux",
    "autre",
  ];

  const statut = statuts.includes(params.statut ?? "")
    ? params.statut!
    : "a_traiter";

  const type = types.includes(params.type ?? "") ? params.type! : "tous";

  const motif = motifs.includes(params.motif ?? "") ? params.motif! : "tous";

  const recherche = params.recherche?.trim() ?? "";

  const page = entierPositif(params.page, 1);

  const parPageBrut = entierPositif(params.parPage, 25);

  const parPage = [25, 50, 100].includes(parPageBrut) ? parPageBrut : 25;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_lister_signalements", {
    p_statut: statut,

    p_type: type,

    p_motif: motif,

    p_recherche: recherche || null,

    p_page: page,

    p_limite: parPage,
  });

  if (error) {
    console.error("Erreur liste signalements :", {
      code: error.code,

      message: error.message,

      details: error.details,

      hint: error.hint,
    });

    return (
      <main className="mx-auto max-w-7xl p-6">
        <p className="text-red-500">Impossible de charger les signalements.</p>
      </main>
    );
  }

  const signalements = (data ?? []) as Signalement[];

  if (page > 1 && signalements.length === 0) {
    redirect("/admin/signalements");
  }

  const total = Number(signalements[0]?.total_resultats ?? 0);

  const pages = Math.max(1, Math.ceil(total / parPage));

  function urlPage(nouvellePage: number) {
    const query = new URLSearchParams();

    query.set("statut", statut);

    query.set("type", type);

    query.set("motif", motif);

    query.set("parPage", String(parPage));

    query.set("page", String(nouvellePage));

    if (recherche) {
      query.set("recherche", recherche);
    }

    return `/admin/signalements?${query.toString()}`;
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
          Signalements
        </h1>

        <p
          className="
                        mt-1
                        text-sm
                        text-gray-500
                    "
        >
          {total} signalement
          {total > 1 ? "s" : ""} correspondant aux filtres.
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
                    xl:grid-cols-5
                "
      >
        <input
          type="search"
          name="recherche"
          defaultValue={recherche}
          placeholder="Cible, signaleur ou commentaire"
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
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
          <option value="a_traiter">À traiter</option>

          <option value="tous">Tous les statuts</option>

          <option value="ouvert">Ouverts</option>

          <option value="en_cours">En cours</option>

          <option value="traite">Traités</option>

          <option value="rejete">Rejetés</option>
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
          <option value="tous">Profils + sorties</option>

          <option value="profil">Profils</option>

          <option value="sortie">Sorties</option>
        </select>

        <select
          name="motif"
          defaultValue={motif}
          className="
                        rounded-lg
                        border
                        bg-background
                        px-3
                        py-2
                    "
        >
          <option value="tous">Tous les motifs</option>

          <option value="spam">Spam</option>

          <option value="harcelement">Harcèlement</option>

          <option value="contenu_inapproprie">Contenu inapproprié</option>

          <option value="faux_profil">Faux profil</option>

          <option value="comportement_dangereux">Comportement dangereux</option>

          <option value="autre">Autre</option>
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
              <th className="px-4 py-3">Date</th>

              <th className="px-4 py-3">Cible</th>

              <th className="px-4 py-3">Motif</th>

              <th className="px-4 py-3">Signalé par</th>

              <th className="px-4 py-3">Commentaire</th>

              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>

          <tbody>
            {signalements.map((signalement) => {
              const hrefSignalement = `/admin/signalements/${signalement.signalement_id}`;

              return (
                <tr
                  key={signalement.signalement_id}
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
                                                text-gray-500
                                            "
                  >
                    {afficherDate(signalement.date_signalement)}
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={hrefSignalement}
                      className="
                                                    font-medium
                                                    hover:underline
                                                "
                    >
                      {signalement.cible_libelle}
                    </Link>

                    <p
                      className="
                                                    mt-1
                                                    text-xs
                                                    text-gray-500
                                                "
                    >
                      {signalement.type_cible === "profil"
                        ? "Profil"
                        : "Sortie"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {afficherMotif(signalement.motif)}
                  </td>

                  <td className="px-4 py-3">
                    {signalement.signaleur_id ? (
                      <Link
                        href={`/admin/utilisateurs/${signalement.signaleur_id}`}
                        className="hover:underline"
                      >
                        {signalement.signaleur_nom ?? "Compte supprimé"}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Compte supprimé</span>
                    )}
                  </td>

                  <td
                    className="
                                                max-w-sm
                                                px-4
                                                py-3
                                                text-gray-500
                                            "
                  >
                    {signalement.commentaire ?? "—"}
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
                      {afficherStatut(signalement.statut)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {signalements.length === 0 && (
          <div
            className="
                            p-8
                            text-center
                            text-sm
                            text-gray-500
                        "
          >
            Aucun signalement.
          </div>
        )}
      </div>

      {/* PAGINATION */}

      <div
        className="
                    flex
                    items-center
                    justify-between
                    gap-4
                "
      >
        <p className="text-sm text-gray-500">
          Page {page} sur {pages}
        </p>

        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={urlPage(page - 1)}
              className="
                                rounded
                                border
                                px-3
                                py-2
                                text-sm
                            "
            >
              ← Précédent
            </Link>
          )}

          {page < pages && (
            <Link
              href={urlPage(page + 1)}
              className="
                                rounded
                                border
                                px-3
                                py-2
                                text-sm
                            "
            >
              Suivant →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
