import { createClient } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import ProfileForm from "./profile-form";

import NotificationsEmailButton from "./notifications-email-button";

export default async function ProfilPage() {
  const supabase = await createClient();

  // ------------------------------------------------
  // UTILISATEUR
  // ------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ------------------------------------------------
  // PROFIL
  // ------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
  nom,
  age,
  sexe,
  description,
  lieu_recherche,
  rayon_recherche_km,
  position_recherche
`,
    )
    .eq("id", user.id)
    .maybeSingle();

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main
      className="
      mx-auto
      max-w-xl
      p-6
    "
    >
      <h1
        className="
        mb-8
        text-2xl
        font-bold
      "
      >
        Mon profil
      </h1>

      {/* PROFIL */}

      <ProfileForm userId={user.id} initialProfile={profile} />

      {/* NOTIFICATIONS */}

      {profile && (
        <section
          className="
          mt-8
          border-t
          pt-6
        "
        >
          <h2
            className="
            text-lg
            font-semibold
          "
          >
            Notifications
          </h2>

          <p
            className="
            mb-4
            mt-1
            text-sm
            text-gray-500
          "
          >
            Gérez les notifications liées à vos sorties et participations.
          </p>

          <NotificationsEmailButton />
        </section>
      )}

      {/* COMPTE */}

      <section
        className="
        mt-8
        border-t
        pt-6
      "
      >
        <h2
          className="
          text-lg
          font-semibold
        "
        >
          Compte
        </h2>

        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="
              rounded
              border
              px-4
              py-2
            "
          >
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
}
