import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const maintenant = new Date();

  const ilYA7Jours = new Date(
    maintenant.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const maintenantIso = maintenant.toISOString();

  const [
    profilsResult,
    nouveauxProfilsResult,
    sortiesResult,
    nouvellesSortiesResult,
    sortiesAVenirResult,
    participationsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gte("created_at", ilYA7Jours),

    supabase.from("sorties").select("*", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("sorties")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gte("created_at", ilYA7Jours),

    supabase
      .from("sorties")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("statut", "planifiee")
      .gt("date_heure_depart", maintenantIso),

    supabase.from("participations").select("*", {
      count: "exact",
      head: true,
    }),
  ]);

  const erreur =
    profilsResult.error ||
    nouveauxProfilsResult.error ||
    sortiesResult.error ||
    nouvellesSortiesResult.error ||
    sortiesAVenirResult.error ||
    participationsResult.error;

  if (erreur) {
    console.error("Erreur dashboard admin :", erreur);

    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold">Administration</h1>

        <p className="mt-6 text-destructive">
          Impossible de charger les statistiques.
        </p>
      </main>
    );
  }

  const statistiques = [
    {
      titre: "Profils",
      valeur: profilsResult.count ?? 0,
      detail: `+${nouveauxProfilsResult.count ?? 0} sur 7 jours`,
    },
    {
      titre: "Sorties",
      valeur: sortiesResult.count ?? 0,
      detail: `+${nouvellesSortiesResult.count ?? 0} sur 7 jours`,
    },
    {
      titre: "Sorties à venir",
      valeur: sortiesAVenirResult.count ?? 0,
      detail: "Sorties planifiées",
    },
    {
      titre: "Participations",
      valeur: participationsResult.count ?? 0,
      detail: "Inscriptions enregistrées",
    },
  ];

  return (
    <main
      className="
                mx-auto
                max-w-5xl
                space-y-8
                p-6
            "
    >
      <div>
        <p
          className="
                        text-sm
                        font-medium
                        text-primary-strong
                    "
        >
          runIN
        </p>

        <h1
          className="
                        mt-1
                        text-2xl
                        font-bold
                    "
        >
          Administration
        </h1>

        <p
          className="
                        mt-2
                        text-sm
                        text-muted-foreground
                    "
        >
          Vue générale de la plateforme.
        </p>
      </div>

      <section
        className="
    grid
    gap-4
    sm:grid-cols-2
    lg:grid-cols-4
  "
      >
        {statistiques.map((statistique) => (
          <div
            key={statistique.titre}
            className="
        rounded-xl
        border
        border-border
        bg-card
        p-5
      "
          >
            <p className="text-sm text-muted-foreground">{statistique.titre}</p>

            <p className="mt-2 text-3xl font-bold">{statistique.valeur}</p>

            <p className="mt-2 text-xs text-muted-foreground">
              {statistique.detail}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2
          className="
                        mb-4
                        text-lg
                        font-semibold
                    "
        >
          Administration
        </h2>

        <div
          className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        lg:grid-cols-3
                    "
        >
          <Link
            href="/admin/utilisateurs"
            className="
  rounded-xl
  border
  border-border
  bg-card
  p-5
  transition-colors
  hover:bg-accent/50
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
"
          >
            <h3 className="font-semibold">Utilisateurs</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Recherche, rôles et sanctions.
            </p>

            <p
              className="
            mt-4
            text-sm
            font-medium
            text-primary-strong
        "
            >
              Gérer les utilisateurs →
            </p>
          </Link>

          <Link
            href="/admin/sorties"
            className="
  rounded-xl
  border
  border-border
  bg-card
  p-5
  transition-colors
  hover:bg-accent/50
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
"
          >
            <h3 className="font-semibold">Sorties</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Rechercher et administrer les sorties de la plateforme.
            </p>

            <p
              className="
            mt-4
            text-sm
            font-medium
            text-primary-strong
        "
            >
              Gérer les sorties →
            </p>
          </Link>

          <Link
            href="/admin/systeme"
            className="
        rounded-xl
        border
        p-5
        transition
        hover:bg-accent/50
    "
          >
            <h3 className="font-semibold">Système</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Accès à Supabase, Vercel, Resend et aux informations techniques de
              runIN.
            </p>

            <p
              className="
            mt-4
            text-sm
            font-medium
            text-primary-strong
        "
            >
              Ouvrir le système →
            </p>
          </Link>

          <Link
            href="/admin/journal"
            className="
  rounded-xl
  border
  border-border
  bg-card
  p-5
  transition-colors
  hover:bg-accent/50
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
"
          >
            <h3 className="font-semibold">Journal</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Historique des sanctions, changements de rôles et autres actions
              administratives.
            </p>

            <p
              className="
            mt-4
            text-sm
            font-medium
            text-primary-strong
        "
            >
              Consulter le journal →
            </p>
          </Link>

          <Link
            href="/admin/signalements"
            className="
  rounded-xl
  border
  border-border
  bg-card
  p-5
  transition-colors
  hover:bg-accent/50
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
"
          >
            <h3 className="font-semibold">Signalements</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Examiner les profils et sorties signalés par les utilisateurs.
            </p>

            <p
              className="
            mt-4
            text-sm
            font-medium
            text-primary-strong
        "
            >
              Voir les signalements →
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
