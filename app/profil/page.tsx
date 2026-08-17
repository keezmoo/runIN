import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";

export default async function ProfilPage() {
  const supabase = await createClient();

  // Récupère l'utilisateur actuellement connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si personne n'est connecté, retour à la page de connexion
  if (!user) {
    redirect("/auth/login");
  }

  // Cherche le profil correspondant à cet utilisateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, age, sexe, lieu_recherche, rayon_recherche_km, position_recherche")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Mon profil</h1>
      
      <ProfileForm
        userId={user.id}
        initialProfile={profile}
      />
      <form
        action="/auth/signout"
        method="post"
        className="mt-8"
      >
        <button
          type="submit"
          className="rounded border px-4 py-2"
        >
          Se déconnecter
        </button>
      </form>

    </main>

  );
}