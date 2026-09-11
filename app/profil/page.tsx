import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import BlocageUtilisateurButton from "@/components/blocage-utilisateur-button";
import ProfileForm from "./profile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  // POSITION DE RECHERCHE
  // ------------------------------------------------

  let positionRechercheInitiale: {
    latitude: number;
    longitude: number;
  } | null = null;

  if (profile) {
    const { data: filtreGeographiqueData, error: filtreGeographiqueError } =
      await supabase.rpc("mon_filtre_geographique");

    if (filtreGeographiqueError) {
      console.error(
        "Erreur chargement position de recherche :",
        filtreGeographiqueError,
      );
    } else {
      const filtreGeographique = filtreGeographiqueData?.[0] ?? null;

      if (filtreGeographique) {
        const latitude = Number(filtreGeographique.latitude);

        const longitude = Number(filtreGeographique.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          positionRechercheInitiale = {
            latitude,
            longitude,
          };
        }
      }
    }
  }

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

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <main className="mx-auto max-w-xl px-4 py-4 md:p-6">
      <h1 className="hidden text-2xl font-bold md:mb-8 md:block">Profil</h1>

      {/* PROFIL */}

      <ProfileForm
        userId={user.id}
        initialProfile={profile}
        initialPosition={positionRechercheInitiale}
      />

      {/* RÉSEAU */}

      {profile && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Réseau</h2>

          <Card className="overflow-hidden">
            <Link
              href={`/membres/${user.id}/abonnes`}
              className="
              flex
              items-center
              justify-between
              gap-4
              border-b
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
              <span className="font-medium">Abonnés</span>

              <div className="flex items-center gap-3">
                <span className="font-semibold">{nombreAbonnes}</span>

                <span
                  className="text-lg leading-none text-muted-foreground"
                  aria-hidden="true"
                >
                  ›
                </span>
              </div>
            </Link>

            <Link
              href={`/membres/${user.id}/abonnements`}
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
              <span className="font-medium">Abonnements</span>

              <div className="flex items-center gap-3">
                <span className="font-semibold">{nombreAbonnements}</span>

                <span
                  className="text-lg leading-none text-muted-foreground"
                  aria-hidden="true"
                >
                  ›
                </span>
              </div>
            </Link>
          </Card>
        </section>
      )}

      {/* UTILISATEURS BLOQUÉS */}

      {utilisateursBloques.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Utilisateurs bloqués</h2>

          <Card className="max-h-56 overflow-y-auto">
            <div className="divide-y">
              {utilisateursBloques.map((utilisateurBloque) => (
                <div
                  key={utilisateurBloque.id}
                  className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  px-4
                  py-3
                "
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {utilisateurBloque.nom}
                  </span>

                  <BlocageUtilisateurButton
                    utilisateurId={utilisateurBloque.id}
                    mode="debloquer"
                  />
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* NOTIFICATIONS */}

      {profile && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Notifications</h2>

          <Card className="p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Gérez les notifications liées à vos sorties et participations.
            </p>

            <NotificationsEmailButton />
          </Card>
        </section>
      )}

      {/* COMPTE */}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Compte</h2>

        <Card className="p-4">
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
