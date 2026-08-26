import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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

  if (idsProfils.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nom")
      .in("id", idsProfilsVisibles);

    profils = data ?? [];
  }

  const profilsParId = new Map(profils.map((profil) => [profil.id, profil]));

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href={`/membres/${id}`} className="mb-6 inline-block underline">
        ← Retour au profil
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Abonnements de {profile.nom}</h1>

      {profils.length === 0 ? (
        <p className="text-gray-500">Aucun abonnement pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {idsProfils.map((profilId) => {
            if (idsIndisponibles.has(profilId)) {
              return (
                <div
                  key={profilId}
                  className="
          rounded
          border
          px-4
          py-3
          text-gray-500
        "
                >
                  <span className="font-medium">Profil indisponible</span>
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
        block
        rounded
        border
        px-4
        py-3
        transition
        hover:bg-gray-500/5
      "
              >
                <span className="font-medium">{profil.nom}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
