import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AbonnementsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // BLOCAGES
  // ------------------------------------------------

  if (user.id !== id) {
    const { data: relationBloquee, error: relationBloqueeError } =
      await supabase.rpc("est_relation_bloquee", {
        p_autre_utilisateur_id: id,
      });

    if (relationBloqueeError) {
      notFound();
    }

    if (relationBloquee) {
      notFound();
    }
  }

  const {
    data: utilisateursIndisponiblesData,
    error: utilisateursIndisponiblesError,
  } = await supabase.rpc("mes_utilisateurs_indisponibles");

  if (utilisateursIndisponiblesError) {
    notFound();
  }

  const idsIndisponibles = new Set(
    (utilisateursIndisponiblesData ?? []).map(
      (ligne: { utilisateur_id: string }) => ligne.utilisateur_id,
    ),
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nom")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: suivis } = await supabase
    .from("suivis")
    .select("profil_suivi_id")
    .eq("utilisateur_id", id)
    .order("created_at", {
      ascending: false,
    });

  const idsProfils = suivis?.map((suivi) => suivi.profil_suivi_id) ?? [];

  const idsProfilsVisibles = idsProfils.filter(
    (profilId) => !idsIndisponibles.has(profilId),
  );

  let profils: {
    id: string;
    nom: string;
  }[] = [];

  if (idsProfilsVisibles.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nom")
      .in("id", idsProfilsVisibles);

    profils = data ?? [];
  }

  const profilsParId = new Map(profils.map((profil) => [profil.id, profil]));

  return (
  <main className="mx-auto max-w-xl px-4 py-4 md:p-6">
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-4 -ml-3"
    >
      <Link href={`/membres/${id}`}>
        ← Retour au profil
      </Link>
    </Button>

    <h1 className="mb-4 text-2xl font-bold md:mb-6">
      Abonnés de {profile.nom}
    </h1>

    {idsProfils.length === 0 ? (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Aucun abonné pour le moment.
        </p>
      </Card>
    ) : (
      <Card className="overflow-hidden">
        <div className="divide-y">
          {idsProfils.map((profilId) => {
            if (idsIndisponibles.has(profilId)) {
              return (
                <div
                  key={profilId}
                  className="
                    px-4
                    py-3
                    text-sm
                    text-muted-foreground
                  "
                >
                  <span className="font-medium">
                    Profil indisponible
                  </span>
                </div>
              );
            }

            const profil = profilsParId.get(profilId);

            if (!profil) {
              return null;
            }

            return (
              <Link
                key={profil.id}
                href={`/membres/${profil.id}`}
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
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
                <span className="min-w-0 truncate font-medium">
                  {profil.nom}
                </span>

                <span
                  className="text-lg leading-none text-muted-foreground"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    )}
  </main>
);
}
