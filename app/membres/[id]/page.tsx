import { createClient } from "@/lib/supabase/server";
import SuivreButton from "./suivre-button";
import { notFound, redirect } from "next/navigation";
import BlocageUtilisateurButton from "@/components/blocage-utilisateur-button";
import Link from "next/link";
import SignalerButton from "@/components/signaler-button";
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
  // BLOCAGE
  // ------------------------------------------------

  const estMonProfil = user.id === id;

  let relationBloquee = false;
  let jeLaiBloque = false;

  if (!estMonProfil) {
    const [
      { data: relationBloqueeData, error: relationBloqueeError },
      { data: monBlocage, error: monBlocageError },
    ] = await Promise.all([
      supabase.rpc("est_relation_bloquee", {
        p_autre_utilisateur_id: id,
      }),

      supabase
        .from("blocages")
        .select("bloque_id")
        .eq("bloqueur_id", user.id)
        .eq("bloque_id", id)
        .maybeSingle(),
    ]);

    if (relationBloqueeError) {
      console.error(
        "Erreur vérification relation bloquée :",
        relationBloqueeError,
      );

      return (
        <main className="mx-auto max-w-xl p-6">
          <p>Impossible de charger ce profil.</p>
        </main>
      );
    }

    if (monBlocageError) {
      console.error("Erreur vérification de mon blocage :", monBlocageError);
    }

    relationBloquee = relationBloqueeData === true;
    jeLaiBloque = monBlocage !== null;
  }

  if (relationBloquee) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-bold">Profil indisponible</h1>

        <p className="mt-3 text-sm text-gray-500">
          Ce profil n&apos;est pas accessible.
        </p>

        {jeLaiBloque && (
          <div className="mt-6">
            <BlocageUtilisateurButton utilisateurId={id} mode="debloquer" />
          </div>
        )}
      </main>
    );
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
  // DONNÉES DU PROFIL
  // ------------------------------------------------

  const suiviPromise = estMonProfil
    ? Promise.resolve({
        data: null as { profil_suivi_id: string } | null,
        error: null,
      })
    : supabase
        .from("suivis")
        .select("profil_suivi_id")
        .eq("utilisateur_id", user.id)
        .eq("profil_suivi_id", profil.id)
        .maybeSingle();

  const [abonnesResult, abonnementsResult, suiviResult, sortiesResult] =
    await Promise.all([
      supabase
        .from("suivis")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("profil_suivi_id", profil.id),

      supabase
        .from("suivis")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("utilisateur_id", profil.id),

      suiviPromise,

      supabase
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
        .limit(5),
    ]);

  if (
    abonnesResult.error ||
    abonnementsResult.error ||
    suiviResult.error ||
    sortiesResult.error
  ) {
    console.error("Erreur chargement données du profil :", {
      abonnes: abonnesResult.error,
      abonnements: abonnementsResult.error,
      suivi: suiviResult.error,
      sorties: sortiesResult.error,
    });

    return (
      <main className="mx-auto max-w-xl p-6">
        <p>Impossible de charger ce profil.</p>
      </main>
    );
  }

  const nombreAbonnes = abonnesResult.count ?? 0;

  const nombreAbonnements = abonnementsResult.count ?? 0;

  const estSuivi = !estMonProfil && suiviResult.data !== null;

  const prochainesSorties = sortiesResult.data ?? [];

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{profil.nom}</h1>

            <p className="mt-1 text-sm text-gray-500">
              {profil.age} ans
              {" • "}
              {afficherSexe(profil.sexe)}
            </p>
          </div>

          {!estMonProfil && (
            <SuivreButton
              profilId={profil.id}
              estSuiviInitialement={estSuivi}
            />
          )}
        </div>

        {/* ABONNÉS / ABONNEMENTS */}

        <div className="mt-4 flex gap-6 text-sm">
          <Link
            href={`/membres/${profil.id}/abonnes`}
            className="hover:underline"
          >
            <strong>{nombreAbonnes}</strong>{" "}
            {nombreAbonnes === 1 ? "abonné" : "abonnés"}
          </Link>

          <Link
            href={`/membres/${profil.id}/abonnements`}
            className="hover:underline"
          >
            <strong>{nombreAbonnements}</strong>{" "}
            {nombreAbonnements === 1 ? "abonnement" : "abonnements"}
          </Link>
        </div>
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

      {/* BLOCAGE */}

      {/* ACTIONS SUR UN AUTRE PROFIL */}

      {!estMonProfil && (
        <section className="mt-8 border-t pt-6">
          <div className="space-y-4">
            <BlocageUtilisateurButton
              utilisateurId={profil.id}
              mode="bloquer"
            />

            <SignalerButton
              typeCible="profil"
              cibleId={profil.id}
              libelle="Signaler ce profil"
            />
          </div>
        </section>
      )}

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
