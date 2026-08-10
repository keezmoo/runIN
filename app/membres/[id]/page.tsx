import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MembrePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // Vérifie qu'un utilisateur est connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Recherche le profil demandé
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, age, sexe")
    .eq("id", id)
    .maybeSingle();

  // Profil inexistant
  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link
        href="/sorties"
        className="mb-6 inline-block underline"
      >
        ← Retour aux sorties
      </Link>

      <h1 className="mb-6 text-2xl font-bold">
        {profile.nom}
      </h1>

      <div className="space-y-3">
        <p>
          <strong>Âge :</strong> {profile.age} ans
        </p>

        <p>
          <strong>Sexe :</strong>{" "}
          {profile.sexe === "homme"
            ? "Homme"
            : profile.sexe === "femme"
              ? "Femme"
              : "Autre"}
        </p>
      </div>
    </main>
  );
}