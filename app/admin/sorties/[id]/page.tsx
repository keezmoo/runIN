import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ActionsSortie from "./actions-sortie";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SortieAdmin = {
  sortie_id: string;
  titre: string;

  organisateur_id: string;
  organisateur_nom: string;
  organisateur_email: string | null;

  date_heure_depart: string;
  lieu_depart: string;

  type_sortie: string;
  mode_inscription: string;
  type_entrainement: string;

  distance_km: number | null;
  denivele_positif_m: number | null;
  duree_estimee_minutes: number | null;
  intensite: string;
  allure_secondes_km: number | null;

  description: string | null;
  statut: string;

  nombre_max_participants: number;
  nombre_participants: number;
  nombre_demandes: number;
  nombre_conversations: number;
  nombre_messages: number;

  date_creation: string;
};

function afficherDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

export default async function AdminDetailSortiePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_detail_sortie", {
    p_sortie_id: id,
  });

  if (error) {
    console.error("Erreur détail sortie admin :", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    notFound();
  }

  const sortie = data?.[0] as SortieAdmin | undefined;

  if (!sortie) {
    notFound();
  }

  const estPassee = new Date(sortie.date_heure_depart) <= new Date();

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
          href="/admin/sorties"
          className="
                        text-sm
                        text-gray-500
                        hover:underline
                    "
        >
          ← Sorties
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
          <h1 className="text-2xl font-bold">{sortie.titre}</h1>

          <span
            className="
                            rounded-full
                            border
                            px-3
                            py-1
                            text-xs
                        "
          >
            {sortie.statut === "annulee"
              ? "Annulée"
              : estPassee
                ? "Terminée"
                : "Planifiée"}
          </span>

          <span
            className="
                            rounded-full
                            border
                            px-3
                            py-1
                            text-xs
                        "
          >
            {sortie.type_sortie === "trail" ? "Trail" : "Route"}
          </span>
        </div>
      </div>

      {/* INFORMATIONS */}

      <section
        className="
                    grid
                    gap-4
                    md:grid-cols-2
                "
      >
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">Sortie</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Identifiant</dt>

              <dd className="break-all">{sortie.sortie_id}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Départ</dt>

              <dd>{afficherDate(sortie.date_heure_depart)}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Lieu</dt>

              <dd>{sortie.lieu_depart}</dd>
            </div>

            <div>
              <dt className="text-gray-500">Créée le</dt>

              <dd>{afficherDate(sortie.date_creation)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">Organisateur</h2>

          <div className="mt-4">
            <Link
              href={`/admin/utilisateurs/${sortie.organisateur_id}`}
              className="
                                font-medium
                                hover:underline
                            "
            >
              {sortie.organisateur_nom}
            </Link>

            <p
              className="
                                mt-1
                                text-sm
                                text-gray-500
                            "
            >
              {sortie.organisateur_email}
            </p>
          </div>
        </div>
      </section>

      {/* ACTIVITÉ */}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Activité</h2>

        <div
          className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        lg:grid-cols-4
                    "
        >
          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Participants</p>

            <p className="mt-1 text-2xl font-bold">
              {sortie.nombre_participants}
              {" / "}
              {sortie.nombre_max_participants}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Demandes</p>

            <p className="mt-1 text-2xl font-bold">{sortie.nombre_demandes}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Conversations</p>

            <p className="mt-1 text-2xl font-bold">
              {sortie.nombre_conversations}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-gray-500">Messages</p>

            <p className="mt-1 text-2xl font-bold">{sortie.nombre_messages}</p>
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}

      {sortie.description && (
        <section className="rounded-xl border p-5">
          <h2 className="font-semibold">Description</h2>

          <p
            className="
                            mt-3
                            whitespace-pre-wrap
                            text-sm
                        "
          >
            {sortie.description}
          </p>
        </section>
      )}

      {/* ACTIONS ADMIN */}

      <ActionsSortie
        sortieId={sortie.sortie_id}
        titre={sortie.titre}
        statut={sortie.statut}
        estPassee={estPassee}
        nombreParticipants={sortie.nombre_participants}
        nombreMessages={sortie.nombre_messages}
      />

      <Link
        href={`/sorties/${sortie.sortie_id}`}
        className="
                    inline-block
                    text-sm
                    text-[#8ED8B6]
                    hover:underline
                "
      >
        Voir la sortie côté utilisateur →
      </Link>
    </main>
  );
}
