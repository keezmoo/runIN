import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";


export const dynamic = "force-dynamic";


type PageProps = {
  searchParams: Promise<{
    recherche?: string;
    tri?: string;
    role?: string;
    statut?: string;
    page?: string;
    parPage?: string;
  }>;
};


type UtilisateurAdmin = {
  utilisateur_id: string;
  nom: string;
  email: string | null;
  age: number;
  sexe: string;
  role: string;

  statut_compte:
    | "actif"
    | "suspendu"
    | "banni";

  sanction_type:
    | "suspension"
    | "bannissement"
    | null;

  sanction_date_fin: string | null;

  date_inscription: string;
  derniere_connexion: string | null;

  nombre_sorties: number;
  nombre_participations: number;

  total_resultats: number;
};


function afficherDate(
  date: string | null,
) {
  if (!date) {
    return "Jamais";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(
    new Date(date),
  );
}


function afficherRole(
  role: string,
) {
  if (
    role ===
    "administrateur"
  ) {
    return "Administrateur";
  }

  if (
    role ===
    "moderateur"
  ) {
    return "Modérateur";
  }

  return "Utilisateur";
}


function afficherStatutCompte(
  utilisateur: UtilisateurAdmin,
) {
  if (
    utilisateur.statut_compte ===
    "banni"
  ) {
    return {
      libelle:
        "Banni",

      detail:
        "Définitivement",

      classe:
        "border-red-800 bg-red-950/30 text-red-400",
    };
  }


  if (
    utilisateur.statut_compte ===
    "suspendu"
  ) {
    return {
      libelle:
        "Suspendu",

      detail:
        utilisateur.sanction_date_fin
          ? `Jusqu'au ${afficherDate(
              utilisateur.sanction_date_fin,
            )}`
          : null,

      classe:
        "border-orange-800 bg-orange-950/30 text-orange-400",
    };
  }


  return {
    libelle:
      "Actif",

    detail:
      null,

    classe:
      "border-green-800 bg-green-950/30 text-green-400",
  };
}


function nombreEntierPositif(
  valeur: string | undefined,
  valeurParDefaut: number,
) {
  const nombre =
    Number(valeur);

  if (
    !Number.isInteger(
      nombre,
    ) ||
    nombre < 1
  ) {
    return valeurParDefaut;
  }

  return nombre;
}


export default async function UtilisateursAdminPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;


  // ==========================================================
  // PARAMETRES
  // ==========================================================

  const recherche =
    params.recherche?.trim() ??
    "";


  const trisAutorises = [
    "date_desc",
    "date_asc",
    "nom_asc",
    "nom_desc",
    "connexion_desc",
  ];


  const tri =
    trisAutorises.includes(
      params.tri ?? "",
    )
      ? params.tri!
      : "date_desc";


  const rolesAutorises = [
    "tous",
    "utilisateur",
    "moderateur",
    "administrateur",
  ];


  const role =
    rolesAutorises.includes(
      params.role ?? "",
    )
      ? params.role!
      : "tous";


  const statutsAutorises = [
    "tous",
    "actif",
    "suspendu",
    "banni",
  ];


  const statutCompte =
    statutsAutorises.includes(
      params.statut ?? "",
    )
      ? params.statut!
      : "tous";


  const valeursParPage = [
    25,
    50,
    100,
  ];


  const parPageDemande =
    nombreEntierPositif(
      params.parPage,
      25,
    );


  const parPage =
    valeursParPage.includes(
      parPageDemande,
    )
      ? parPageDemande
      : 25;


  const page =
    nombreEntierPositif(
      params.page,
      1,
    );


  // ==========================================================
  // DONNEES
  // ==========================================================

  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "admin_lister_utilisateurs_page",
      {
        p_recherche:
          recherche ||
          null,

        p_tri:
          tri,

        p_role:
          role,

        p_statut_compte:
          statutCompte,

        p_page:
          page,

        p_limite:
          parPage,
      },
    );


  if (error) {
    console.error(
      "=== ERREUR LISTE UTILISATEURS ADMIN ===",
    );

    console.error(
      "CODE :",
      error.code,
    );

    console.error(
      "MESSAGE :",
      error.message,
    );

    console.error(
      "DETAILS :",
      error.details,
    );

    console.error(
      "HINT :",
      error.hint,
    );


    return (
      <main
        className="
          mx-auto
          max-w-6xl
          p-6
        "
      >
        <h1
          className="
            text-2xl
            font-bold
          "
        >
          Utilisateurs
        </h1>

        <p
          className="
            mt-6
            text-red-500
          "
        >
          Impossible de charger
          les utilisateurs.
        </p>
      </main>
    );
  }


  const utilisateurs =
    (
      data ?? []
    ) as UtilisateurAdmin[];


  // ==========================================================
  // PAGE INEXISTANTE
  // ==========================================================

  if (
    page > 1 &&
    utilisateurs.length === 0
  ) {
    const query =
      new URLSearchParams();


    if (recherche) {
      query.set(
        "recherche",
        recherche,
      );
    }


    query.set(
      "tri",
      tri,
    );

    query.set(
      "role",
      role,
    );

    query.set(
      "statut",
      statutCompte,
    );

    query.set(
      "parPage",
      String(parPage),
    );


    redirect(
      `/admin/utilisateurs?${query.toString()}`,
    );
  }


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalResultats =
    utilisateurs[0]
      ?.total_resultats ??
    0;


  const nombrePages =
    Math.max(
      1,
      Math.ceil(
        totalResultats /
          parPage,
      ),
    );


  function urlPage(
    nouvellePage: number,
  ) {
    const query =
      new URLSearchParams();


    if (recherche) {
      query.set(
        "recherche",
        recherche,
      );
    }


    query.set(
      "tri",
      tri,
    );

    query.set(
      "role",
      role,
    );

    query.set(
      "statut",
      statutCompte,
    );

    query.set(
      "parPage",
      String(parPage),
    );

    // IMPORTANT :
    // cette ligne manquait
    // dans ta version.
    query.set(
      "page",
      String(nouvellePage),
    );


    return (
      `/admin/utilisateurs?${query.toString()}`
    );
  }


  const premiereLigne =
    totalResultats === 0
      ? 0
      : (
          page - 1
        ) *
          parPage +
        1;


  const derniereLigne =
    Math.min(
      page * parPage,
      totalResultats,
    );


  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main
      className="
        mx-auto
        max-w-6xl
        space-y-6
        p-6
      "
    >
      {/* EN-TETE */}

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
          Utilisateurs
        </h1>


        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          {totalResultats} utilisateur
          {totalResultats > 1
            ? "s"
            : ""}{" "}
          correspondant aux filtres.
        </p>
      </div>


      {/* ==================================================
          FILTRES
      ================================================== */}

      <form
        method="get"
        className="
          grid
          gap-3
          rounded-xl
          border
          p-4
          md:grid-cols-2
          lg:grid-cols-6
        "
      >
        <input
          type="search"
          name="recherche"
          defaultValue={
            recherche
          }
          placeholder="Nom ou adresse e-mail"
          maxLength={100}
          className="
            min-w-0
            rounded-lg
            border
            bg-background
            px-3
            py-2
            lg:col-span-2
          "
        />


        <select
          name="role"
          defaultValue={
            role
          }
          className="
            rounded-lg
            border
            bg-background
            px-3
            py-2
          "
        >
          <option value="tous">
            Tous les rôles
          </option>

          <option value="utilisateur">
            Utilisateurs
          </option>

          <option value="moderateur">
            Modérateurs
          </option>

          <option value="administrateur">
            Administrateurs
          </option>
        </select>


        <select
          name="statut"
          defaultValue={
            statutCompte
          }
          className="
            rounded-lg
            border
            bg-background
            px-3
            py-2
          "
        >
          <option value="tous">
            Tous les états
          </option>

          <option value="actif">
            Actifs
          </option>

          <option value="suspendu">
            Suspendus
          </option>

          <option value="banni">
            Bannis
          </option>
        </select>


        <select
          name="tri"
          defaultValue={
            tri
          }
          className="
            rounded-lg
            border
            bg-background
            px-3
            py-2
          "
        >
          <option value="date_desc">
            Plus récents
          </option>

          <option value="date_asc">
            Plus anciens
          </option>

          <option value="nom_asc">
            Nom A → Z
          </option>

          <option value="nom_desc">
            Nom Z → A
          </option>

          <option value="connexion_desc">
            Dernière connexion
          </option>
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


        <input
          type="hidden"
          name="parPage"
          value={parPage}
        />
      </form>


      {/* ==================================================
          TABLEAU
      ================================================== */}

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
            min-w-[1050px]
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
              <th className="px-4 py-3">
                Utilisateur
              </th>

              <th className="px-4 py-3">
                Rôle
              </th>

              <th className="px-4 py-3">
                État
              </th>

              <th className="px-4 py-3">
                Inscription
              </th>

              <th className="px-4 py-3">
                Dernière connexion
              </th>

              <th
                className="
                  px-4
                  py-3
                  text-center
                "
              >
                Sorties
              </th>

              <th
                className="
                  px-4
                  py-3
                  text-center
                "
              >
                Participations
              </th>
            </tr>
          </thead>


          <tbody>
            {utilisateurs.map(
              (
                utilisateur,
              ) => {
                const statut =
                  afficherStatutCompte(
                    utilisateur,
                  );


                return (
                  <tr
                    key={
                      utilisateur.utilisateur_id
                    }
                    className="
                      border-b
                      last:border-b-0
                    "
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={
                          `/admin/utilisateurs/${utilisateur.utilisateur_id}`
                        }
                        className="
                          font-medium
                          hover:underline
                        "
                      >
                        {
                          utilisateur.nom
                        }
                      </Link>


                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-gray-500
                        "
                      >
                        {
                          utilisateur.email ??
                          "Aucun e-mail"
                        }
                      </p>


                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-gray-500
                        "
                      >
                        {
                          utilisateur.age
                        }{" "}
                        ans
                        {" · "}
                        {
                          utilisateur.sexe
                        }
                      </p>
                    </td>


                    <td className="px-4 py-3">
                      {
                        afficherRole(
                          utilisateur.role,
                        )
                      }
                    </td>


                    <td className="px-4 py-3">
                      <div>
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            border
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            ${statut.classe}
                          `}
                        >
                          {
                            statut.libelle
                          }
                        </span>


                        {statut.detail && (
                          <p
                            className="
                              mt-1
                              whitespace-nowrap
                              text-xs
                              text-gray-500
                            "
                          >
                            {
                              statut.detail
                            }
                          </p>
                        )}
                      </div>
                    </td>


                    <td className="px-4 py-3">
                      {
                        afficherDate(
                          utilisateur.date_inscription,
                        )
                      }
                    </td>


                    <td className="px-4 py-3">
                      {
                        afficherDate(
                          utilisateur.derniere_connexion,
                        )
                      }
                    </td>


                    <td
                      className="
                        px-4
                        py-3
                        text-center
                      "
                    >
                      {
                        utilisateur.nombre_sorties
                      }
                    </td>


                    <td
                      className="
                        px-4
                        py-3
                        text-center
                      "
                    >
                      {
                        utilisateur.nombre_participations
                      }
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>


        {utilisateurs.length ===
          0 && (
          <div
            className="
              p-8
              text-center
              text-sm
              text-gray-500
            "
          >
            Aucun utilisateur trouvé.
          </div>
        )}
      </div>


      {/* ==================================================
          BAS DU TABLEAU
      ================================================== */}

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
        <p
          className="
            text-sm
            text-gray-500
          "
        >
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
              <input
                type="hidden"
                name="recherche"
                value={
                  recherche
                }
              />
            )}


            <input
              type="hidden"
              name="tri"
              value={tri}
            />


            <input
              type="hidden"
              name="role"
              value={role}
            />


            <input
              type="hidden"
              name="statut"
              value={
                statutCompte
              }
            />


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
                defaultValue={
                  String(
                    parPage,
                  )
                }
                className="
                  rounded
                  border
                  bg-background
                  px-2
                  py-1
                "
              >
                <option value="25">
                  25
                </option>

                <option value="50">
                  50
                </option>

                <option value="100">
                  100
                </option>
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
                href={
                  urlPage(
                    page - 1,
                  )
                }
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
              Page {page} sur{" "}
              {nombrePages}
            </span>


            {page <
            nombrePages ? (
              <Link
                href={
                  urlPage(
                    page + 1,
                  )
                }
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