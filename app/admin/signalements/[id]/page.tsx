import Link from "next/link";

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ActionsSignalement from "./actions-signalement";
import ActionsSanction from "../../utilisateurs/[id]/actions-sanction";

import ActionsSortie from "../../sorties/[id]/actions-sortie";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Signalement = {
  signalement_id: string;

  type_cible: string;
  cible_id: string;
  cible_libelle: string;

  cible_utilisateur_id: string | null;

  cible_utilisateur_nom: string | null;

  cible_utilisateur_email: string | null;

  cible_utilisateur_role: string;

  cible_profil_existe: boolean;

  cible_sortie_existe: boolean;

  signaleur_id: string | null;

  signaleur_nom: string | null;

  signaleur_email: string | null;

  motif: string;

  commentaire: string | null;

  statut: string;

  assigne_a: string | null;

  assigne_nom: string | null;

  date_signalement: string;

  date_mise_a_jour: string;

  traite_at: string | null;

  traite_par: string | null;

  traite_par_nom: string | null;

  decision_commentaire: string | null;
};

type DetailUtilisateurActions = {
  utilisateur_id: string;
  nom: string;
  role: string;

  sanction_active_id: string | null;

  sanction_active_type: string | null;
};

type DetailSortieActions = {
  sortie_id: string;
  titre: string;
  statut: string;

  date_heure_depart: string;

  nombre_participants: number;
  nombre_messages: number;
};

type DetailMessageSignalement = {
  signalement_id: string;

  contenu_snapshot: string | null;

  auteur_nom_snapshot: string | null;

  date_message_snapshot: string | null;
};

type ContexteMessage = {
  message_id: string;
  auteur_id: string;
  auteur_nom: string;
  contenu: string;
  created_at: string;
  est_message_signale: boolean;
};

function afficherDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

function afficherMotif(motif: string) {
  switch (motif) {
    case "spam":
      return "Spam";

    case "harcelement":
      return "Harcèlement";

    case "contenu_inapproprie":
      return "Contenu inapproprié";

    case "faux_profil":
      return "Faux profil";

    case "comportement_dangereux":
      return "Comportement dangereux";

    default:
      return "Autre";
  }
}

function afficherStatut(statut: string) {
  switch (statut) {
    case "ouvert":
      return "Ouvert";

    case "en_cours":
      return "En cours";

    case "traite":
      return "Traité";

    case "rejete":
      return "Rejeté";

    default:
      return statut;
  }
}

function afficherRole(role: string) {
  switch (role) {
    case "administrateur":
      return "Administrateur";

    case "moderateur":
      return "Modérateur";

    default:
      return "Utilisateur";
  }
}

export default async function SignalementAdminPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: roleConnecteData, error: roleConnecteError } =
    await supabase.rpc("mon_role_application");

  if (roleConnecteError) {
    console.error("Erreur lecture rôle connecté :", {
      code: roleConnecteError.code,

      message: roleConnecteError.message,

      details: roleConnecteError.details,

      hint: roleConnecteError.hint,
    });
  }

  const roleConnecte =
    typeof roleConnecteData === "string" ? roleConnecteData : "utilisateur";

  const { data, error } = await supabase.rpc("admin_detail_signalement", {
    p_signalement_id: id,
  });

  if (error) {
    console.error("Erreur détail signalement :", {
      code: error.code,

      message: error.message,

      details: error.details,

      hint: error.hint,
    });

    notFound();
  }

  const signalement = (data?.[0] ?? null) as Signalement | null;

  if (!signalement) {
    notFound();
  }

  // ============================================================
  // INFORMATIONS NECESSAIRES AUX ACTIONS ADMINISTRATIVES
  // ============================================================

  let detailUtilisateur: DetailUtilisateurActions | null = null;

  let detailSortie: DetailSortieActions | null = null;

  let detailMessage: DetailMessageSignalement | null = null;

  let contexteMessage: ContexteMessage[] = [];

  // ------------------------------------------------------------
  // PROFIL SIGNALE
  // ------------------------------------------------------------

  if (
    (signalement.type_cible === "profil" ||
      signalement.type_cible === "message") &&
    signalement.cible_utilisateur_id
  ) {
    const { data: utilisateurData, error: utilisateurError } =
      await supabase.rpc("admin_detail_utilisateur", {
        p_utilisateur_id: signalement.cible_utilisateur_id,
      });

    if (utilisateurError) {
      console.error("Erreur détail utilisateur pour signalement :", {
        code: utilisateurError.code,

        message: utilisateurError.message,

        details: utilisateurError.details,

        hint: utilisateurError.hint,
      });
    } else {
      detailUtilisateur = (utilisateurData?.[0] ??
        null) as DetailUtilisateurActions | null;
    }
  }

  // ------------------------------------------------------------
  // SORTIE SIGNALEE
  // ------------------------------------------------------------

  if (signalement.type_cible === "sortie" && signalement.cible_sortie_existe) {
    const { data: sortieData, error: sortieError } = await supabase.rpc(
      "admin_detail_sortie",
      {
        p_sortie_id: signalement.cible_id,
      },
    );

    if (sortieError) {
      console.error("Erreur détail sortie pour signalement :", {
        code: sortieError.code,

        message: sortieError.message,

        details: sortieError.details,

        hint: sortieError.hint,
      });
    } else {
      detailSortie = (sortieData?.[0] ?? null) as DetailSortieActions | null;
    }
  }

  // ------------------------------------------------------------
  // MESSAGE SIGNALE
  // ------------------------------------------------------------

  if (signalement.type_cible === "message") {
    // Message ciblé
    const { data: messageData, error: messageError } = await supabase.rpc(
      "admin_detail_message_signalement",
      {
        p_signalement_id: signalement.signalement_id,
      },
    );

    if (messageError) {
      console.error("Erreur détail message signalé :", {
        code: messageError.code,
        message: messageError.message,
        details: messageError.details,
        hint: messageError.hint,
      });
    } else {
      detailMessage = (messageData?.[0] ??
        null) as DetailMessageSignalement | null;
    }

    // Contexte du message
    const { data: contexteData, error: contexteError } = await supabase.rpc(
      "admin_contexte_message_signalement",
      {
        p_signalement_id: signalement.signalement_id,
      },
    );

    if (contexteError) {
      console.error("Erreur contexte message signalé :", {
        code: contexteError.code,
        message: contexteError.message,
        details: contexteError.details,
        hint: contexteError.hint,
      });
    } else if (Array.isArray(contexteData)) {
      contexteMessage = contexteData as unknown as ContexteMessage[];
    }
  }

  return (
    <main
      className="
                mx-auto
                max-w-5xl
                space-y-6
                p-6
            "
    >
      {/* EN-TÊTE */}

      <div>
        <Link
          href="/admin/signalements"
          className="
                        text-sm
                        text-gray-500
                        hover:underline
                    "
        >
          ← Signalements
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
            Signalement
          </h1>

          <span
            className="
                            rounded-full
                            border
                            px-2
                            py-1
                            text-xs
                        "
          >
            {afficherStatut(signalement.statut)}
          </span>
        </div>

        <p
          className="
                        mt-2
                        break-all
                        text-xs
                        text-gray-500
                    "
        >
          {signalement.signalement_id}
        </p>
      </div>

      {/* SIGNALEMENT */}

      <section
        className="
                    rounded-xl
                    border
                    p-5
                "
      >
        <h2 className="font-semibold">Signalement</h2>

        <dl
          className="
                        mt-4
                        grid
                        gap-4
                        md:grid-cols-2
                    "
        >
          <div>
            <dt className="text-sm text-gray-500">Motif</dt>

            <dd className="mt-1 font-medium">
              {afficherMotif(signalement.motif)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Date</dt>

            <dd className="mt-1">
              {afficherDate(signalement.date_signalement)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Type de cible</dt>

            <dd className="mt-1">
              {signalement.type_cible === "profil" ? "Profil" : "Sortie"}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Pris en charge par</dt>

            <dd className="mt-1">{signalement.assigne_nom ?? "Personne"}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-sm text-gray-500">Commentaire du signaleur</p>

          <p
            className="
                            mt-2
                            whitespace-pre-wrap
                        "
          >
            {signalement.commentaire ?? "Aucun commentaire."}
          </p>
        </div>
      </section>

      {/* CIBLE */}

      <section
        className="
                    rounded-xl
                    border
                    p-5
                "
      >
        <h2 className="font-semibold">Contenu signalé</h2>

        <p
          className="
                        mt-4
                        text-lg
                        font-medium
                    "
        >
          {signalement.cible_libelle}
        </p>

        {signalement.type_cible === "profil" &&
          signalement.cible_profil_existe && (
            <Link
              href={`/admin/utilisateurs/${signalement.cible_id}`}
              className="
                            mt-3
                            inline-block
                            text-sm
                            text-[#8ED8B6]
                            hover:underline
                        "
            >
              Ouvrir le profil dans l&apos;administration →
            </Link>
          )}

        {signalement.type_cible === "sortie" &&
          signalement.cible_sortie_existe && (
            <Link
              href={`/admin/sorties/${signalement.cible_id}`}
              className="
                            mt-3
                            inline-block
                            text-sm
                            text-[#8ED8B6]
                            hover:underline
                        "
            >
              Ouvrir la sortie dans l&apos;administration →
            </Link>
          )}

        {signalement.cible_utilisateur_id && (
          <div
            className="
                            mt-5
                            border-t
                            pt-4
                        "
          >
            <p className="text-sm text-gray-500">Utilisateur concerné</p>

            <Link
              href={`/admin/utilisateurs/${signalement.cible_utilisateur_id}`}
              className="
                                mt-1
                                inline-block
                                font-medium
                                hover:underline
                            "
            >
              {signalement.cible_utilisateur_nom ?? "Compte supprimé"}
            </Link>

            <p
              className="
                                mt-1
                                text-sm
                                text-gray-500
                            "
            >
              {signalement.cible_utilisateur_email ?? "E-mail indisponible"}
            </p>

            <p
              className="
                                mt-1
                                text-sm
                                text-gray-500
                            "
            >
              Rôle : {afficherRole(signalement.cible_utilisateur_role)}
            </p>
          </div>
        )}
      </section>
      {/* MESSAGE SIGNALE */}

      {signalement.type_cible === "message" && (
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-semibold">Message signalé</h2>

          {detailMessage ? (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="font-medium">Auteur :</span>{" "}
                  {detailMessage.auteur_nom_snapshot ?? "Utilisateur"}
                </p>

                <p>
                  <span className="font-medium">Date du message :</span>{" "}
                  {afficherDate(detailMessage.date_message_snapshot)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Contenu conservé au moment du signalement
                </p>

                <div
                  className="
  whitespace-pre-wrap
  break-words
  rounded-lg
  border
  border-red-500/40
  bg-red-500/5
  p-4
  text-sm
"
                >
                  {detailMessage.contenu_snapshot || "Contenu indisponible."}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Cet extrait est une copie conservée au moment du signalement. Il
                reste disponible même si le message original disparaît.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Impossible de charger la copie du message signalé.
            </p>
          )}
        </section>
      )}

      {/* CONTEXTE DU MESSAGE */}

      {signalement.type_cible === "message" && (
        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Contexte de la conversation</h2>

          <p className="mt-1 text-sm text-gray-500">
            Jusqu&apos;à 10 messages précédant le message signalé ont été
            conservés au moment du signalement.
          </p>

          {contexteMessage.filter((message) => !message.est_message_signale)
            .length > 0 ? (
            <div className="mt-4 space-y-2">
              {contexteMessage
                .filter((message) => !message.est_message_signale)
                .map((message) => (
                  <div
                    key={message.message_id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {message.auteur_nom}
                      </p>

                      <p className="text-xs text-gray-500">
                        {afficherDate(message.created_at)}
                      </p>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {message.contenu}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Aucun message précédent n&apos;est disponible.
            </p>
          )}
        </section>
      )}

      {/* =========================================================
    ACTION SUR LE CONTENU SIGNALE
    ========================================================= */}

      {signalement.type_cible === "profil" && detailUtilisateur && (
        <div className="space-y-2">
          <p
            className="
                text-sm
                text-gray-500
            "
          >
            Une sanction appliquée ici ne clôture pas automatiquement le
            signalement.
          </p>

          <ActionsSanction
            utilisateurId={detailUtilisateur.utilisateur_id}
            nom={detailUtilisateur.nom}
            role={detailUtilisateur.role}
            sanctionActiveId={detailUtilisateur.sanction_active_id}
            sanctionActiveType={detailUtilisateur.sanction_active_type}
            roleConnecte={roleConnecte}
            estCompteCourant={user?.id === detailUtilisateur.utilisateur_id}
          />
        </div>
      )}

      {signalement.type_cible === "sortie" && detailSortie && (
        <div className="space-y-2">
          <p
            className="
                text-sm
                text-gray-500
            "
          >
            Une action sur la sortie ne clôture pas automatiquement le
            signalement.
          </p>

          <ActionsSortie
            sortieId={detailSortie.sortie_id}
            titre={detailSortie.titre}
            statut={detailSortie.statut}
            estPassee={
              new Date(detailSortie.date_heure_depart).getTime() < Date.now()
            }
            nombreParticipants={Number(detailSortie.nombre_participants)}
            nombreMessages={Number(detailSortie.nombre_messages)}
            retourApresSuppression={`/admin/signalements/${signalement.signalement_id}`}
          />
        </div>
      )}

      {/* SIGNALEUR */}

      <section
        className="
                    rounded-xl
                    border
                    p-5
                "
      >
        <h2 className="font-semibold">Signalé par</h2>

        {signalement.signaleur_id ? (
          <>
            <Link
              href={`/admin/utilisateurs/${signalement.signaleur_id}`}
              className="
                                mt-4
                                inline-block
                                font-medium
                                hover:underline
                            "
            >
              {signalement.signaleur_nom ?? "Utilisateur"}
            </Link>

            <p
              className="
                                mt-1
                                text-sm
                                text-gray-500
                            "
            >
              {signalement.signaleur_email ?? "E-mail indisponible"}
            </p>
          </>
        ) : (
          <p className="mt-4 text-gray-500">Compte supprimé.</p>
        )}
      </section>

      {/* ACTIONS */}

      <ActionsSignalement
        signalementId={signalement.signalement_id}
        statut={signalement.statut}
        assigneA={signalement.assigne_a}
        assigneNom={signalement.assigne_nom}
        utilisateurConnecteId={user?.id ?? ""}
      />

      {/* DECISION EXISTANTE */}

      {signalement.traite_at && (
        <section
          className="
                        rounded-xl
                        border
                        p-5
                    "
        >
          <h2 className="font-semibold">Décision</h2>

          <p className="mt-4">{afficherStatut(signalement.statut)}</p>

          <p
            className="
                            mt-1
                            text-sm
                            text-gray-500
                        "
          >
            {afficherDate(signalement.traite_at)}

            {signalement.traite_par_nom
              ? ` par ${signalement.traite_par_nom}`
              : ""}
          </p>

          <p
            className="
                            mt-4
                            whitespace-pre-wrap
                        "
          >
            {signalement.decision_commentaire ?? "—"}
          </p>
        </section>
      )}
    </main>
  );
}
