import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import SortieForm from "./sortie-form";

export default async function NouvelleSortiePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profil, error: profilError } = await supabase
    .from("profiles")
    .select("sexe")
    .eq("id", user.id)
    .maybeSingle();

  if (profilError || !profil) {
    redirect("/profil");
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Titre */}
      <h1 className="mb-6 text-2xl font-bold">Créer une sortie</h1>

      {/* Formulaire */}
      <SortieForm
        sexeOrganisateur={profil.sexe as "homme" | "femme" | "autre"}
      />
    </main>
  );
}
