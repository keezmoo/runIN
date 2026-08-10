import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SortieForm from "./sortie-form";

export default async function NouvelleSortiePage() {
  const supabase = await createClient();

  // Récupère l'utilisateur connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si personne n'est connecté
  if (!user) {
    redirect("/auth/login");
  }

  // Vérifie que l'utilisateur possède déjà un profil runIN
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  // Pas de profil = impossible de créer une sortie
  if (!profile) {
    redirect("/profil");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Créer une sortie
      </h1>

      <SortieForm userId={user.id} />
    </main>
  );
}
