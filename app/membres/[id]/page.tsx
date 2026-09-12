import { createClient } from "@/lib/supabase/server";
import SuivreButton from "./suivre-button";
import { notFound, redirect } from "next/navigation";
import BlocageUtilisateurButton from "@/components/blocage-utilisateur-button";
import Link from "next/link";
import SignalerButton from "@/components/signaler-button";
import { afficherAllure, afficherIntensite } from "@/lib/sortie-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateLongue, formatHeure, getDateKey } from "@/lib/date-utils";
import AvatarUtilisateur from "@/components/avatar-utilisateur";

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
        <main className="mx-auto max-w-xl px-4 py-4 md:p-6">
          <p className="text-sm text-destructive">
            Impossible de charger ce profil.
          </p>
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

        <p className="mt-3 text-sm text-muted-foreground">
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
      <main className="mx-auto max-w-xl px-4 py-4 md:p-6">
        <p className="text-sm text-destructive">
          Impossible de charger ce profil.
        </p>
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
    <main className="mx-auto max-w-xl px-4 py-4 md:p-6">
      {/* PROFIL */}

      <header className="mb-6">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <AvatarUtilisateur
              nom={profil.nom}
              utilisateurId={profil.id}
              taille="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold">{profil.nom}</h1>

                  <p className="mt-1 text-sm text-muted-foreground">
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
            </div>
          </div>

          {/* ABONNÉS / ABONNEMENTS */}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href={`/membres/${profil.id}/abonnes`}
              className="
              rounded-sm
              transition-colors
              hover:text-primary-strong
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            >
              <strong>{nombreAbonnes}</strong>{" "}
              <span className="text-muted-foreground">
                {nombreAbonnes === 1 ? "abonné" : "abonnés"}
              </span>
            </Link>

            <Link
              href={`/membres/${profil.id}/abonnements`}
              className="
              rounded-sm
              transition-colors
              hover:text-primary-strong
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            >
              <strong>{nombreAbonnements}</strong>{" "}
              <span className="text-muted-foreground">
                {nombreAbonnements === 1 ? "abonnement" : "abonnements"}
              </span>
            </Link>
          </div>
        </Card>
      </header>

      {/* DESCRIPTION */}

      <section>
        <h2 className="mb-3 text-lg font-semibold">À propos</h2>

        <Card className="p-4">
          {profil.description && profil.description.trim() !== "" ? (
            <p className="whitespace-pre-wrap text-sm">{profil.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ce coureur n&apos;a pas encore ajouté de présentation.
            </p>
          )}
        </Card>
      </section>

      {/* SORTIES ORGANISÉES */}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">
          Prochaines sorties organisées
        </h2>

        {prochainesSorties.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Aucune sortie organisée prochainement.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
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
                    px-4
                    py-3
                    transition-colors
                    hover:bg-accent/50
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-inset
                    focus-visible:ring-ring
                  "
                  >
                    <p className="text-xs text-muted-foreground">
                      {formatDateLongue(dateKey)}
                      {" — "}
                      {formatHeure(sortie.date_heure_depart)}
                    </p>

                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <h3 className="min-w-0 truncate font-semibold">
                        {sortie.titre}
                      </h3>

                      <span className="shrink-0 text-sm text-muted-foreground">
                        {sortie.type_sortie === "trail" ? "Trail" : "Route"}
                      </span>
                    </div>

                    {infosSportives && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {infosSportives}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      {/* ACTIONS SUR UN AUTRE PROFIL */}

      {!estMonProfil && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Actions</h2>

          <Card className="p-4">
            <div className="flex flex-wrap gap-3">
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
          </Card>
        </section>
      )}

      {/* PROPRE PROFIL */}

      {estMonProfil && (
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/profil">Modifier mon profil</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
