import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="mx-auto flex min-h-svh max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/40">
        <CardHeader>
          <p className="text-sm font-medium text-destructive">
            Compte restreint
          </p>

          <CardTitle className="text-2xl">
            {bannissement
              ? "Votre compte a été banni"
              : "Votre compte est temporairement suspendu"}
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            L&apos;accès aux fonctionnalités de runIN est actuellement désactivé
            pour ce compte.
          </p>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Motif
            </p>

            <p className="mt-2">{sanction.motif}</p>
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Début de la sanction</dt>

              <dd className="mt-1">{afficherDate(sanction.date_debut)}</dd>
            </div>

            {!bannissement && sanction.date_fin && (
              <div>
                <dt className="text-muted-foreground">Fin de la suspension</dt>

                <dd className="mt-1">{afficherDate(sanction.date_fin)}</dd>
              </div>
            )}

            {bannissement && (
              <div>
                <dt className="text-muted-foreground">Durée</dt>

                <dd className="mt-1">Bannissement sans date de fin</dd>
              </div>
            )}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline">
                Se déconnecter
              </Button>
            </form>

            <Button asChild variant="outline">
              <Link href="/confidentialite">Confidentialité</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
