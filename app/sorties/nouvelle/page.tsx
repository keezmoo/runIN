import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import SortieForm from "./sortie-form";

export default async function NouvelleSortiePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/profil");
  }

  return (
    <main className="mx-auto max-w-2xl p-6">

      {/* Bouton retour */}
      <div className="mb-8">
        <Link
          href="/sorties"
          className="rounded border px-4 py-2"
        >
          ← Toutes les sorties
        </Link>
      </div>

      {/* Titre */}
      <h1 className="mb-6 text-2xl font-bold">
        Créer une sortie
      </h1>

      {/* Formulaire */}
      <SortieForm userId={user.id} />

    </main>
  );
}