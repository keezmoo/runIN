import Link from "next/link";

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import ActionsSignalement from "./actions-signalement";

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

function afficherTypeCible(type: string) {
  switch (type) {
    case "profil":
      return "Profil";

    case "sortie":
      return "Sortie";

    case "message":
      return "Message privé";

    default:
      return type;
  }
}

export default async function SignalementAdminPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ------------------------------------------------------------
  // ROLE DU GESTIONNAIRE CONNECTE
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // SIGNALEMENT
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // UTILISATEUR CONCERNE
  // ------------------------------------------------------------

  let detailUtilisateur: DetailUtilisateurActions | null = null;

  if (signalement.cible_utilisateur_id) {
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
  // MESSAGE + CONTEXTE
  // ------------------------------------------------------------

  let detailMessage: DetailMessageSignalement | null = null;

  let contexteMessage: ContexteMessage[] = [];

  if (signalement.type_cible === "message") {
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

  const messagesPrecedents = contexteMessage.filter(
    (message) => !message.est_message_signale,
  );

  const nomUtilisateurConcerne =
    detailUtilisateur?.nom ??
    signalement.cible_utilisateur_nom ??
    "Compte supprimé";

  const roleUtilisateurConcerne =
    detailUtilisateur?.role ?? signalement.cible_utilisateur_role;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* =====================================================
          EN-TETE
          ===================================================== */}

      <header>
        <Link
          href="/admin/signalements"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Signalements
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Signalement</h1>

          <span className="rounded-full border px-2 py-1 text-xs">
            {afficherStatut(signalement.statut)}
          </span>
        </div>

        <p className="mt-2 break-all text-xs text-gray-500">
          {signalement.signalement_id}
        </p>
      </header>

      {/* =====================================================
          1 — DETAIL DU SIGNALEMENT
          ===================================================== */}

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Détail du signalement</h2>

        <dl className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {/* PLAIGNANT */}

          <div>
            <dt className="text-sm text-gray-500">Signalé par</dt>

            <dd className="mt-1">
              {signalement.signaleur_id ? (
                <Link
                  href={`/admin/utilisateurs/${signalement.signaleur_id}`}
                  className="group inline-block"
                >
                  <span className="block font-medium group-hover:underline">
                    {signalement.signaleur_nom ?? "Utilisateur"}
                  </span>

                  <span className="mt-1 block break-all font-mono text-xs text-gray-500 group-hover:underline">
                    {signalement.signaleur_id}
                  </span>
                </Link>
              ) : (
                <span className="text-gray-500">Compte supprimé</span>
              )}
            </dd>
          </div>

          {/* UTILISATEUR CONCERNE */}

          <div>
            <dt className="text-sm text-gray-500">Utilisateur concerné</dt>

            <dd className="mt-1">
              {signalement.cible_utilisateur_id ? (
                <Link
                  href={`/admin/utilisateurs/${signalement.cible_utilisateur_id}`}
                  className="group inline-block"
                >
                  <span className="block font-medium group-hover:underline">
                    {nomUtilisateurConcerne}
                  </span>

                  <span className="mt-1 block break-all font-mono text-xs text-gray-500 group-hover:underline">
                    {signalement.cible_utilisateur_id}
                  </span>
                </Link>
              ) : (
                <span className="text-gray-500">
                  Compte supprimé ou indisponible
                </span>
              )}

              {signalement.cible_utilisateur_id && (
                <p className="mt-1 text-xs text-gray-500">
                  {afficherRole(roleUtilisateurConcerne)}
                </p>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Type</dt>

            <dd className="mt-1 font-medium">
              {afficherTypeCible(signalement.type_cible)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Motif</dt>

            <dd className="mt-1 font-medium">
              {afficherMotif(signalement.motif)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Date du signalement</dt>

            <dd className="mt-1">
              {afficherDate(signalement.date_signalement)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Prise en charge</dt>

            <dd className="mt-1">
              {signalement.assigne_nom ?? "Pas encore pris en charge"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t pt-5">
          <p className="text-sm text-gray-500">Commentaire du signaleur</p>

          <p className="mt-2 whitespace-pre-wrap">
            {signalement.commentaire ?? "Aucun commentaire."}
          </p>
        </div>
      </section>

      {/* =====================================================
          2 — CONTENU DU SIGNALEMENT
          ===================================================== */}

      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Contenu du signalement</h2>

        {/* MESSAGE */}

        {signalement.type_cible === "message" && (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Conversation conservée au moment du signalement. Jusqu&apos;à 10
              messages précédents sont affichés.
            </p>

            <div className="mt-5 space-y-3">
              {messagesPrecedents.map((message) => (
                <article
                  key={message.message_id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">{message.auteur_nom}</p>

                    <p className="text-xs text-gray-500">
                      {afficherDate(message.created_at)}
                    </p>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {message.contenu}
                  </p>
                </article>
              ))}

              {detailMessage ? (
                <article
                  className="
                    rounded-lg
                    border-2
                    border-red-500/60
                    bg-red-500/5
                    p-4
                  "
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {detailMessage.auteur_nom_snapshot ??
                          nomUtilisateurConcerne}
                      </p>

                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                        Message signalé
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      {afficherDate(detailMessage.date_message_snapshot)}
                    </p>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                    {detailMessage.contenu_snapshot ?? "Contenu indisponible."}
                  </p>
                </article>
              ) : (
                <div className="rounded-lg border border-red-500/40 p-4 text-sm text-gray-500">
                  Impossible de charger la copie du message signalé.
                </div>
              )}
            </div>
          </>
        )}

        {/* PROFIL */}

        {signalement.type_cible === "profil" && (
          <div className="mt-5">
            <p className="text-lg font-medium">{signalement.cible_libelle}</p>

            {signalement.cible_profil_existe ? (
              <Link
                href={`/admin/utilisateurs/${signalement.cible_id}`}
                className="mt-3 inline-block text-sm font-medium text-[#8ED8B6] hover:underline"
              >
                Ouvrir le profil →
              </Link>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Ce profil n&apos;existe plus.
              </p>
            )}
          </div>
        )}

        {/* SORTIE */}

        {signalement.type_cible === "sortie" && (
          <div className="mt-5">
            <p className="text-lg font-medium">{signalement.cible_libelle}</p>

            {signalement.cible_sortie_existe ? (
              <Link
                href={`/admin/sorties/${signalement.cible_id}`}
                className="mt-3 inline-block text-sm font-medium text-[#8ED8B6] hover:underline"
              >
                Ouvrir la sortie →
              </Link>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Cette sortie n&apos;existe plus.
              </p>
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          3 — TRAITEMENT
          ===================================================== */}

      <ActionsSignalement
        signalementId={signalement.signalement_id}
        statut={signalement.statut}
        assigneA={signalement.assigne_a}
        assigneNom={signalement.assigne_nom}
        utilisateurConnecteId={user?.id ?? ""}
        cibleUtilisateurId={signalement.cible_utilisateur_id}
        cibleUtilisateurNom={nomUtilisateurConcerne}
        cibleUtilisateurRole={roleUtilisateurConcerne}
        sanctionActiveType={detailUtilisateur?.sanction_active_type ?? null}
        roleConnecte={roleConnecte}
        traiteAt={signalement.traite_at}
        traiteParNom={signalement.traite_par_nom}
        decisionCommentaire={signalement.decision_commentaire}
      />
    </main>
  );
}
