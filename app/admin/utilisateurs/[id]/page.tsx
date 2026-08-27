import Link from "next/link";
import { notFound } from "next/navigation";
import ActionsSanction from "./actions-sanction";
import { createClient } from "@/lib/supabase/server";
import ActionsRole from "./actions-role";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type DetailUtilisateur = {
  utilisateur_id: string;
  nom: string;
  email: string | null;
  age: number;
  sexe: string;
  description: string | null;
  date_inscription: string;
  derniere_connexion: string | null;
  role: string;
  nombre_sorties: number;
  nombre_participations: number;
  nombre_messages: number;

  sanction_active_id: string | null;
  sanction_active_type: string | null;
  sanction_active_motif: string | null;
  sanction_active_debut: string | null;
  sanction_active_fin: string | null;
};

type Sanction = {
  id: string;
  type: string;
  motif: string;
  date_debut: string;
  date_fin: string | null;
  created_at: string;
  levee_at: string | null;
  motif_levee: string | null;
};

function afficherDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function afficherRole(role: string) {
  if (role === "administrateur") {
    return "Administrateur";
  }

  if (role === "moderateur") {
    return "Modérateur";
  }

  return "Utilisateur";
}

export default async function AdminUtilisateurPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: roleConnecte, error: roleConnecteError } = await supabase.rpc(
    "mon_role_application",
  );

  if (roleConnecteError) {
    console.error("Erreur lecture rôle administrateur :", roleConnecteError);
  }

  const [detailResult, sanctionsResult] = await Promise.all([
    supabase.rpc("admin_detail_utilisateur", {
      p_utilisateur_id: id,
    }),

    supabase.rpc("admin_historique_sanctions", {
      p_utilisateur_id: id,
    }),
  ]);

  if (detailResult.error) {
    console.error("Erreur fiche utilisateur admin :", {
      code: detailResult.error.code,

      message: detailResult.error.message,

      details: detailResult.error.details,

      hint: detailResult.error.hint,
    });

    notFound();
  }

  const utilisateur = detailResult.data?.[0] as DetailUtilisateur | undefined;

  if (!utilisateur) {
    notFound();
  }

  if (sanctionsResult.error) {
    console.error("Erreur historique sanctions :", {
      code: sanctionsResult.error.code,

      message: sanctionsResult.error.message,

      details: sanctionsResult.error.details,

      hint: sanctionsResult.error.hint,
    });
  }

  const sanctions = (sanctionsResult.data ?? []) as Sanction[];

  return (
    <main
      className="
                mx-auto
                max-w-5xl
                space-y-6
                p-6
            "
    >
      <div>
        <Link
          href="/admin/utilisateurs"
          className="
                        text-sm
                        text-gray-500
                        hover:underline
                    "
        >
          ← Utilisateurs
        </Link>

        <div
          className="
                        mt-3
                        flex
                        flex-wrap
                        items-center
                        gap-3
                    "
        >
          <h1
            className="
                            text-2xl
                            font-bold
                        "
          >
            {utilisateur.nom}
          </h1>

          <span
            className="
                            rounded-full
                            border
                            px-3
                            py-1
                            text-xs
                        "
          >
            {afficherRole(utilisateur.role)}
          </span>
        </div>

        <p
          className="
                        mt-1
                        text-sm
                        text-gray-500
                    "
        >
          {utilisateur.email}
        </p>
      </div>

      <ActionsRole
        utilisateurId={utilisateur.utilisateur_id}
        nom={utilisateur.nom}
        role={utilisateur.role}
        roleConnecte={roleConnecte ?? "utilisateur"}
        estCompteCourant={user?.id === utilisateur.utilisateur_id}
      />

      <ActionsSanction
        utilisateurId={utilisateur.utilisateur_id}
        nom={utilisateur.nom}
        role={utilisateur.role}
        roleConnecte={roleConnecte ?? "utilisateur"}
        sanctionActiveId={utilisateur.sanction_active_id}
        sanctionActiveType={utilisateur.sanction_active_type}
        estCompteCourant={user?.id === utilisateur.utilisateur_id}
      />

      {/* SANCTION ACTIVE */}

      {utilisateur.sanction_active_id && (
        <section
          className="
                        rounded-xl
                        border
                        border-red-800
                        bg-red-950/20
                        p-5
                    "
        >
          <h2
            className="
                            font-semibold
                            text-red-400
                        "
          >
            Sanction active
          </h2>

          <p className="mt-3">
            {utilisateur.sanction_active_type === "bannissement"
              ? "Bannissement définitif"
              : "Suspension temporaire"}
          </p>

          <p
            className="
                            mt-2
                            text-sm
                            text-gray-400
                        "
          >
            {utilisateur.sanction_active_motif}
          </p>

          <p
            className="
                            mt-3
                            text-xs
                            text-gray-500
                        "
          >
            Depuis {afficherDate(utilisateur.sanction_active_debut)}
            {utilisateur.sanction_active_fin &&
              ` · jusqu'au ${afficherDate(utilisateur.sanction_active_fin)}`}
          </p>
        </section>
      )}

      {/* INFORMATIONS */}

      <section
        className="
                    grid
                    gap-4
                    md:grid-cols-2
                "
      >
        <div
          className="
                        rounded-xl
                        border
                        p-5
                    "
        >
          <h2 className="font-semibold">Compte</h2>

          <dl
            className="
                            mt-4
                            space-y-3
                            text-sm
                        "
          >
            <div>
              <dt className="text-gray-500">Identifiant</dt>

              <dd className="break-all">{utilisateur.utilisateur_id}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Inscription</dt>

              <dd>{afficherDate(utilisateur.date_inscription)}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Dernière connexion</dt>

              <dd>{afficherDate(utilisateur.derniere_connexion)}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Rôle</dt>

              <dd>{afficherRole(utilisateur.role)}</dd>
            </div>
          </dl>
        </div>

        <div
          className="
                        rounded-xl
                        border
                        p-5
                    "
        >
          <h2 className="font-semibold">Profil</h2>

          <dl
            className="
                            mt-4
                            space-y-3
                            text-sm
                        "
          >
            <div>
              <dt className="text-gray-500">Âge</dt>

              <dd>{utilisateur.age} ans</dd>
            </div>

            <div>
              <dt className="text-gray-500">Sexe</dt>

              <dd>{utilisateur.sexe}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Description</dt>

              <dd>{utilisateur.description ?? "Aucune description"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ACTIVITÉ */}

      <section>
        <h2
          className="
                        mb-3
                        text-lg
                        font-semibold
                    "
        >
          Activité
        </h2>

        <div
          className="
                        grid
                        gap-4
                        sm:grid-cols-3
                    "
        >
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Sorties créées</p>

            <p className="mt-1 text-2xl font-bold">
              {utilisateur.nombre_sorties}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Participations</p>

            <p className="mt-1 text-2xl font-bold">
              {utilisateur.nombre_participations}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Messages envoyés</p>

            <p className="mt-1 text-2xl font-bold">
              {utilisateur.nombre_messages}
            </p>
          </div>
        </div>
      </section>

      {/* HISTORIQUE */}

      <section>
        <h2
          className="
                        mb-3
                        text-lg
                        font-semibold
                    "
        >
          Historique des sanctions
        </h2>

        {sanctions.length === 0 ? (
          <div
            className="
                            rounded-xl
                            border
                            p-5
                            text-sm
                            text-gray-500
                        "
          >
            Aucune sanction enregistrée.
          </div>
        ) : (
          <div
            className="
                            overflow-hidden
                            rounded-xl
                            border
                        "
          >
            {sanctions.map((sanction) => (
              <div
                key={sanction.id}
                className="
                                        border-b
                                        p-4
                                        last:border-b-0
                                    "
              >
                <div
                  className="
                                            flex
                                            flex-wrap
                                            items-center
                                            justify-between
                                            gap-2
                                        "
                >
                  <p className="font-medium">
                    {sanction.type === "bannissement"
                      ? "Bannissement"
                      : "Suspension"}
                  </p>

                  <span
                    className="
                                                text-xs
                                                text-gray-500
                                            "
                  >
                    {sanction.levee_at
                      ? "Levée"
                      : sanction.date_fin &&
                          new Date(sanction.date_fin) <= new Date()
                        ? "Expirée"
                        : "Active"}
                  </span>
                </div>

                <p
                  className="
                                            mt-2
                                            text-sm
                                        "
                >
                  {sanction.motif}
                </p>

                <p
                  className="
                                            mt-2
                                            text-xs
                                            text-gray-500
                                        "
                >
                  {afficherDate(sanction.date_debut)}

                  {sanction.date_fin && ` → ${afficherDate(sanction.date_fin)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link
        href={`/membres/${utilisateur.utilisateur_id}`}
        className="
                    inline-block
                    text-sm
                    text-[#8ED8B6]
                    hover:underline
                "
      >
        Voir le profil public →
      </Link>
    </main>
  );
}
