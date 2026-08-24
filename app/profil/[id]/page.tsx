import { createClient } from "@/lib/supabase/server";

import { notFound, redirect } from "next/navigation";

import Link from "next/link";

import { afficherAllure, afficherIntensite } from "@/lib/sortie-utils";

import { formatDateLongue, formatHeure, getDateKey } from "@/lib/date-utils";

type ProfilPublicPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function afficherSexe(sexe: string) {
  if (sexe === "femme") {
    return "Femme";
  }

  if (sexe === "autre") {
    return "Autre";
  }

  return "Homme";
}

export default async function ProfilPublicPage({
  params,
}: ProfilPublicPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // ------------------------------------------------
  // UTILISATEUR CONNECTÉ
  // ------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // PROFIL PUBLIC
  // ------------------------------------------------

  const { data: profil, error: profilError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      nom,
      age,
      sexe,
      description
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (profilError || !profil) {
    if (profilError) {
      console.error("Erreur chargement profil public :", profilError);
    }

    notFound();
  }

  // ------------------------------------------------
  // PROCHAINES SORTIES ORGANISÉES
  // ------------------------------------------------

  const { data: sortiesOrganisees, error: sortiesError } = await supabase
    .from("sorties")
    .select(
      `
      id,
      titre,
      date_heure_depart,
      type_sortie,
      distance_km,
      denivele_positif_m,
      allure_secondes_km,
      intensite
    `,
    )
    .eq("organisateur_id", profil.id)
    .eq("statut", "planifiee")
    .gt("date_heure_depart", new Date().toISOString())
    .order("date_heure_depart", {
      ascending: true,
    })
    .limit(5);

  if (sortiesError) {
    console.error("Erreur chargement sorties du profil :", sortiesError);
  }

  const prochainesSorties = sortiesOrganisees ?? [];

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main
      className="
      mx-auto
      max-w-xl
      p-6
    "
    >
      {/* PROFIL */}

      <header className="mb-8">
        <h1
          className="
          text-2xl
          font-bold
        "
        >
          {profil.nom}
        </h1>

        <p
          className="
          mt-1
          text-sm
          text-gray-500
        "
        >
          {profil.age} ans
          {" • "}
          {afficherSexe(profil.sexe)}
        </p>
      </header>

      {/* DESCRIPTION */}

      <section>
        <h2
          className="
          text-lg
          font-semibold
        "
        >
          À propos
        </h2>

        {profil.description && profil.description.trim() !== "" ? (
          <p
            className="
            mt-3
            whitespace-pre-wrap
          "
          >
            {profil.description}
          </p>
        ) : (
          <p
            className="
            mt-3
            text-sm
            text-gray-500
          "
          >
            Ce coureur n&apos;a pas encore ajouté de présentation.
          </p>
        )}
      </section>

      {/* SORTIES ORGANISÉES */}

      <section
        className="
        mt-8
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
          Prochaines sorties organisées
        </h2>

        {prochainesSorties.length === 0 ? (
          <p
            className="
            mt-3
            text-sm
            text-gray-500
          "
          >
            Aucune sortie organisée prochainement.
          </p>
        ) : (
          <div
            className="
            mt-4
            divide-y
            border-y
          "
          >
            {prochainesSorties.map((sortie) => {
              const dateKey = getDateKey(new Date(sortie.date_heure_depart));

              const distance =
                sortie.distance_km !== null
                  ? `${Number(sortie.distance_km).toLocaleString("fr-FR", {
                      maximumFractionDigits: 2,
                    })} km`
                  : null;

              const intensite = afficherIntensite(sortie.intensite);

              const infosSportives =
                sortie.type_sortie === "trail"
                  ? [
                      distance,

                      sortie.denivele_positif_m !== null
                        ? `${sortie.denivele_positif_m} m D+`
                        : null,

                      intensite,
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  : [
                      distance,

                      sortie.allure_secondes_km !== null
                        ? afficherAllure(sortie.allure_secondes_km)
                        : null,

                      intensite,
                    ]
                      .filter(Boolean)
                      .join(" • ");

              return (
                <Link
                  key={sortie.id}
                  href={`/sorties/${sortie.id}`}
                  className="
                      block
                      py-4
                      hover:opacity-70
                    "
                >
                  <p
                    className="
                      text-sm
                      text-gray-500
                    "
                  >
                    {formatDateLongue(dateKey)}
                    {" — "}
                    {formatHeure(sortie.date_heure_depart)}
                  </p>

                  <div
                    className="
                      mt-1
                      flex
                      items-baseline
                      gap-2
                    "
                  >
                    <h3
                      className="
                        font-semibold
                      "
                    >
                      {sortie.titre}
                    </h3>

                    <span
                      className="
                        shrink-0
                        text-sm
                        text-gray-500
                      "
                    >
                      {sortie.type_sortie === "trail" ? "Trail" : "Route"}
                    </span>
                  </div>

                  {infosSportives && (
                    <p
                      className="
                        mt-1
                        text-sm
                        text-gray-500
                      "
                    >
                      {infosSportives}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* PROPRE PROFIL */}

      {user.id === profil.id && (
        <div
          className="
          mt-8
          border-t
          pt-6
        "
        >
          <Link
            href="/profil"
            className="
              inline-block
              rounded
              border
              px-4
              py-2
            "
          >
            Modifier mon profil
          </Link>
        </div>
      )}
    </main>
  );
}
