import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type SanctionActive = {
  sanction_id: string;
  type: string;
  motif: string;
  date_debut: string;
  date_fin: string | null;
};

function afficherDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function SanctionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase.rpc("ma_sanction_active");

  if (error) {
    console.error("Erreur lecture sanction :", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    redirect("/sorties");
  }

  const sanction = data?.[0] as SanctionActive | undefined;

  // La sanction a été levée ou a expiré.
  if (!sanction) {
    redirect("/sorties");
  }

  const bannissement = sanction.type === "bannissement";

  return (
    <main
      className="
                mx-auto
                flex
                min-h-screen
                max-w-xl
                items-center
                px-4
                py-10
            "
    >
      <div
        className="
                    w-full
                    rounded-xl
                    border
                    border-red-900
                    bg-red-950/20
                    p-6
                "
      >
        <p
          className="
                        text-sm
                        font-medium
                        text-red-400
                    "
        >
          Compte restreint
        </p>

        <h1
          className="
                        mt-2
                        text-2xl
                        font-bold
                    "
        >
          {bannissement
            ? "Votre compte a été banni"
            : "Votre compte est temporairement suspendu"}
        </h1>

        <p
          className="
                        mt-4
                        text-sm
                        text-gray-400
                    "
        >
          L&apos;accès aux fonctionnalités de runIN est actuellement désactivé
          pour ce compte.
        </p>

        <div
          className="
                        mt-6
                        rounded-lg
                        border
                        p-4
                    "
        >
          <p
            className="
                            text-xs
                            uppercase
                            text-gray-500
                        "
          >
            Motif
          </p>

          <p className="mt-2">{sanction.motif}</p>
        </div>

        <dl
          className="
                        mt-6
                        space-y-3
                        text-sm
                    "
        >
          <div>
            <dt className="text-gray-500">Début de la sanction</dt>

            <dd>{afficherDate(sanction.date_debut)}</dd>
          </div>

          {!bannissement && sanction.date_fin && (
            <div>
              <dt className="text-gray-500">Fin de la suspension</dt>

              <dd>{afficherDate(sanction.date_fin)}</dd>
            </div>
          )}

          {bannissement && (
            <div>
              <dt className="text-gray-500">Durée</dt>

              <dd>Bannissement sans date de fin</dd>
            </div>
          )}
        </dl>

        <div
          className="
                        mt-8
                        flex
                        flex-wrap
                        gap-3
                    "
        >
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="
                                rounded-lg
                                border
                                px-4
                                py-2
                                text-sm
                            "
            >
              Se déconnecter
            </button>
          </form>

          <Link
            href="/confidentialite"
            className="
                            rounded-lg
                            border
                            px-4
                            py-2
                            text-sm
                        "
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </main>
  );
}
