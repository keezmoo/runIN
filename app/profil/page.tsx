import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import BlocageUtilisateurButton from "@/components/blocage-utilisateur-button";
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
  // RÉSEAU
  // ------------------------------------------------

  let nombreAbonnes = 0;
  let nombreAbonnements = 0;

  if (profile) {
    const [{ count: abonnesCount }, { count: abonnementsCount }] =
      await Promise.all([
        supabase
          .from("suivis")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("profil_suivi_id", user.id),

        supabase
          .from("suivis")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("utilisateur_id", user.id),
      ]);

    nombreAbonnes = abonnesCount ?? 0;
    nombreAbonnements = abonnementsCount ?? 0;
  }

  // ------------------------------------------------
  // UTILISATEURS BLOQUÉS
  // ------------------------------------------------

  const { data: blocagesData, error: blocagesError } = await supabase
    .from("blocages")
    .select("bloque_id, created_at")
    .eq("bloqueur_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (blocagesError) {
    console.error("Erreur chargement utilisateurs bloqués :", blocagesError);
  }

  const idsUtilisateursBloques =
    blocagesData?.map((blocage) => blocage.bloque_id) ?? [];

  let utilisateursBloques: {
    id: string;
    nom: string;
  }[] = [];

  if (idsUtilisateursBloques.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nom")
      .in("id", idsUtilisateursBloques);

    if (error) {
      console.error("Erreur chargement profils bloqués :", error);
    } else {
      utilisateursBloques = data ?? [];
    }
  }

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

      {/* RÉSEAU */}

      {profile && (
        <section
          className="
      mt-8
      border-t
      pt-6
    "
        >
          <h2 className="text-lg font-semibold">Réseau</h2>

          <div className="mt-4 divide-y border-y">
            <Link
              href={`/membres/${user.id}/abonnes`}
              className="
          flex
          items-center
          justify-between
          py-3
          hover:opacity-70
        "
            >
              <span>Abonnés</span>

              <div className="flex items-center gap-3">
                <span className="font-medium">{nombreAbonnes}</span>

                <span className="text-gray-400">›</span>
              </div>
            </Link>

            <Link
              href={`/membres/${user.id}/abonnements`}
              className="
          flex
          items-center
          justify-between
          py-3
          hover:opacity-70
        "
            >
              <span>Abonnements</span>

              <div className="flex items-center gap-3">
                <span className="font-medium">{nombreAbonnements}</span>

                <span className="text-gray-400">›</span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {utilisateursBloques.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium">Utilisateurs bloqués</h3>

          <div
            className="
        mt-3
        max-h-56
        divide-y
        overflow-y-auto
        border-y
      "
          >
            {utilisateursBloques.map((utilisateurBloque) => (
              <div
                key={utilisateurBloque.id}
                className="
              flex
              items-center
              justify-between
              gap-4
              py-3
            "
              >
                <span className="min-w-0 truncate text-sm">
                  {utilisateurBloque.nom}
                </span>

                <BlocageUtilisateurButton
                  utilisateurId={utilisateurBloque.id}
                  mode="debloquer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
