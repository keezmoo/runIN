"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Decision =
  | "rejeter"
  | "infraction"
  | null;

type Sanction =
  | "aucune"
  | "suspension"
  | "bannissement";

type Props = {
  signalementId: string;
  statut: string;

  assigneA: string | null;
  assigneNom: string | null;

  utilisateurConnecteId: string;

  cibleUtilisateurId: string | null;
  cibleUtilisateurNom: string;
  cibleUtilisateurRole: string;

  sanctionActiveType: string | null;

  roleConnecte: string;

  traiteAt: string | null;
  traiteParNom: string | null;
  decisionCommentaire: string | null;
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

export default function ActionsSignalement({
  signalementId,
  statut,

  assigneA,
  assigneNom,

  utilisateurConnecteId,

  cibleUtilisateurId,
  cibleUtilisateurNom,
  cibleUtilisateurRole,

  sanctionActiveType,

  roleConnecte,

  traiteAt,
  traiteParNom,
  decisionCommentaire,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [decision, setDecision] =
    useState<Decision>(null);

  const [sanction, setSanction] =
    useState<Sanction>("aucune");

  const [dureeJours, setDureeJours] =
    useState("7");

  const [commentaire, setCommentaire] =
    useState("");

  const [message, setMessage] =
    useState("");

  const estClos =
    statut === "traite" ||
    statut === "rejete";

  const estAssigneAMoi =
    statut === "en_cours" &&
    assigneA === utilisateurConnecteId;

  const estAssigneAutre =
    statut === "en_cours" &&
    Boolean(assigneA) &&
    !estAssigneAMoi;

  const estCompteCourant =
    cibleUtilisateurId ===
    utilisateurConnecteId;

  const cibleProtegee =
    cibleUtilisateurRole ===
      "administrateur" ||
    (roleConnecte === "moderateur" &&
      cibleUtilisateurRole ===
        "moderateur");

  const peutSanctionner =
    Boolean(cibleUtilisateurId) &&
    !estCompteCourant &&
    !cibleProtegee &&
    !sanctionActiveType &&
    (roleConnecte === "moderateur" ||
      roleConnecte ===
        "administrateur");

  // ------------------------------------------------------------
  // PRISE EN CHARGE
  // ------------------------------------------------------------

  async function prendreEnCharge() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_prendre_signalement",
      {
        p_signalement_id:
          signalementId,
      },
    );

    if (error) {
      const texte =
        error.message ?? "";

      if (
        texte.includes(
          "SIGNALEMENT_DEJA_PRIS_EN_CHARGE",
        )
      ) {
        setMessage(
          "Ce signalement est déjà pris en charge par un autre gestionnaire.",
        );
      } else if (
        texte.includes(
          "SIGNALEMENT_DEJA_CLOTURE",
        )
      ) {
        setMessage(
          "Ce signalement a déjà été clôturé.",
        );
      } else {
        console.error(
          "Erreur prise en charge signalement :",
          error,
        );

        setMessage(
          "Impossible de prendre en charge ce signalement.",
        );
      }

      setLoading(false);

      return;
    }

    router.refresh();

    setLoading(false);
  }

  // ------------------------------------------------------------
  // TRAITEMENT FINAL
  // ------------------------------------------------------------

  async function traiter() {
    if (
      loading ||
      !estAssigneAMoi ||
      !decision
    ) {
      return;
    }

    const commentaireNettoye =
      commentaire.trim();

    if (
      commentaireNettoye.length < 3 ||
      commentaireNettoye.length > 1000
    ) {
      setMessage(
        "La justification doit contenir entre 3 et 1000 caractères.",
      );

      return;
    }

    let duree:
      | number
      | null = null;

    if (
      decision === "infraction" &&
      sanction === "suspension" &&
      peutSanctionner
    ) {
      duree = Number(dureeJours);

      if (
        !Number.isInteger(duree) ||
        duree < 1 ||
        duree > 365
      ) {
        setMessage(
          "La suspension doit durer entre 1 et 365 jours.",
        );

        return;
      }
    }

    // ------------------------------------------
    // REJET
    // ------------------------------------------

    if (decision === "rejeter") {
      if (
        !window.confirm(
          "Rejeter ce signalement ?",
        )
      ) {
        return;
      }

      setLoading(true);
      setMessage("");

      const supabase =
        createClient();

      const { error } =
        await supabase.rpc(
          "admin_clore_signalement",
          {
            p_signalement_id:
              signalementId,

            p_decision:
              "rejete",

            p_commentaire:
              commentaireNettoye,
          },
        );

      if (error) {
        gererErreur(error);

        setLoading(false);

        return;
      }

      router.refresh();

      setLoading(false);

      return;
    }

    // ------------------------------------------
    // INFRACTION CONFIRMEE
    // ------------------------------------------

    const sanctionFinale:
      Sanction =
      peutSanctionner
        ? sanction
        : "aucune";

    let confirmation =
      "Confirmer l'infraction sans appliquer de sanction ?";

    if (
      sanctionFinale ===
      "suspension"
    ) {
      confirmation =
        `Suspendre ${cibleUtilisateurNom} ` +
        `pendant ${duree} jour(s) et traiter le signalement ?`;
    }

    if (
      sanctionFinale ===
      "bannissement"
    ) {
      confirmation =
        `Bannir définitivement ${cibleUtilisateurNom} ` +
        `et traiter le signalement ?`;
    }

    if (
      !window.confirm(
        confirmation,
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase =
      createClient();

    const { error } =
      await supabase.rpc(
        "admin_traiter_signalement_avec_sanction",
        {
          p_signalement_id:
            signalementId,

          p_commentaire:
            commentaireNettoye,

          p_sanction:
            sanctionFinale,

          p_duree_jours:
            sanctionFinale ===
            "suspension"
              ? duree
              : null,
        },
      );

    if (error) {
      gererErreur(error);

      setLoading(false);

      return;
    }

    router.refresh();

    setLoading(false);
  }

  function gererErreur(
    error: {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    },
  ) {
    const texte =
      error.message ?? "";

    if (
      texte.includes(
        "SIGNALEMENT_PRIS_PAR_AUTRE",
      )
    ) {
      setMessage(
        "Ce signalement est pris en charge par un autre gestionnaire.",
      );

      return;
    }

    if (
      texte.includes(
        "SIGNALEMENT_DEJA_CLOTURE",
      )
    ) {
      setMessage(
        "Ce signalement a déjà été clôturé.",
      );

      return;
    }

    if (
      texte.includes(
        "SANCTION_DEJA_ACTIVE",
      )
    ) {
      setMessage(
        "Cet utilisateur possède déjà une sanction active.",
      );

      return;
    }

    if (
      texte.includes(
        "DUREE_SUSPENSION_INVALIDE",
      )
    ) {
      setMessage(
        "La durée de suspension doit être comprise entre 1 et 365 jours.",
      );

      return;
    }

    if (
      texte.includes(
        "AUTO_SANCTION_INTERDITE",
      )
    ) {
      setMessage(
        "Vous ne pouvez pas sanctionner votre propre compte.",
      );

      return;
    }

    if (
      texte.includes(
        "CIBLE_HIERARCHIQUE_PROTEGEE",
      )
    ) {
      setMessage(
        "Votre rôle ne permet pas de sanctionner cet utilisateur.",
      );

      return;
    }

    console.error(
      "Erreur traitement signalement :",
      error,
    );

    setMessage(
      "Impossible de traiter le signalement.",
    );
  }

  // ============================================================
  // SIGNALEMENT DEJA CLOTURE
  // ============================================================

  if (estClos) {
    return (
      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">
          Traitement
        </h2>

        <div className="mt-4 rounded-lg border p-4">
          <p className="font-medium">
            {statut === "rejete"
              ? "Signalement rejeté"
              : "Signalement traité"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {afficherDate(
              traiteAt,
            )}

            {traiteParNom
              ? ` par ${traiteParNom}`
              : ""}
          </p>

          {decisionCommentaire && (
            <p className="mt-4 whitespace-pre-wrap text-sm">
              {
                decisionCommentaire
              }
            </p>
          )}
        </div>
      </section>
    );
  }

  // ============================================================
  // PAGE ACTIVE
  // ============================================================

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">
        Traitement
      </h2>

      {/* PRISE EN CHARGE */}

      <div className="mt-5">
        {statut === "ouvert" && (
          <>
            <p className="mb-3 text-sm text-gray-500">
              Prenez en charge le
              signalement pour pouvoir
              rendre une décision.
            </p>

            <button
              type="button"
              onClick={
                prendreEnCharge
              }
              disabled={loading}
              className="
                rounded-lg
                bg-[#8ED8B6]
                px-4
                py-2
                text-sm
                font-medium
                text-black
                disabled:opacity-40
              "
            >
              {loading
                ? "Prise en charge..."
                : "Prendre en charge"}
            </button>
          </>
        )}

        {estAssigneAMoi && (
          <p className="text-sm font-medium text-[#8ED8B6]">
            Vous avez pris en charge
            ce signalement.
          </p>
        )}

        {estAssigneAutre && (
          <p className="text-sm text-gray-500">
            Signalement pris en charge
            par{" "}
            {assigneNom ??
              "un autre gestionnaire"}.
          </p>
        )}
      </div>

      {/* =====================================================
          ZONE VERROUILLEE TANT QUE NON PRIS EN CHARGE
          ===================================================== */}

      <fieldset
        disabled={
          !estAssigneAMoi ||
          loading
        }
        className={`
          mt-6
          border-t
          pt-6
          transition-opacity
          ${
            estAssigneAMoi
              ? "opacity-100"
              : "opacity-35"
          }
        `}
      >
        {/* DECISION */}

        <p className="text-sm font-semibold">
          Décision
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setDecision(
                "rejeter",
              );

              setSanction(
                "aucune",
              );

              setMessage("");
            }}
            className={`
              rounded-lg
              border
              p-4
              text-left
              transition
              ${
                decision ===
                "rejeter"
                  ? "border-gray-500 bg-gray-500/10"
                  : ""
              }
            `}
          >
            <span className="font-medium">
              Rejeter le signalement
            </span>

            <span className="mt-1 block text-sm text-gray-500">
              Aucune infraction
              constatée.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDecision(
                "infraction",
              );

              setMessage("");
            }}
            className={`
              rounded-lg
              border
              p-4
              text-left
              transition
              ${
                decision ===
                "infraction"
                  ? "border-[#8ED8B6] bg-[#8ED8B6]/10"
                  : ""
              }
            `}
          >
            <span className="font-medium">
              Confirmer l&apos;infraction
            </span>

            <span className="mt-1 block text-sm text-gray-500">
              Le contenu ou le
              comportement enfreint les
              règles.
            </span>
          </button>
        </div>

        {/* SANCTION */}

        {decision ===
          "infraction" && (
          <div className="mt-6">
            <p className="text-sm font-semibold">
              Sanction
            </p>

            {peutSanctionner ? (
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="sanction"
                    checked={
                      sanction ===
                      "aucune"
                    }
                    onChange={() =>
                      setSanction(
                        "aucune",
                      )
                    }
                  />

                  Aucune sanction
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="sanction"
                    checked={
                      sanction ===
                      "suspension"
                    }
                    onChange={() =>
                      setSanction(
                        "suspension",
                      )
                    }
                  />

                  Suspension temporaire
                </label>

                {sanction ===
                  "suspension" && (
                  <div className="ml-7 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={
                        dureeJours
                      }
                      onChange={(
                        event,
                      ) =>
                        setDureeJours(
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-24 rounded-lg border bg-background px-3 py-2 text-sm"
                    />

                    <span className="text-sm text-gray-500">
                      jours
                    </span>
                  </div>
                )}

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="sanction"
                    checked={
                      sanction ===
                      "bannissement"
                    }
                    onChange={() =>
                      setSanction(
                        "bannissement",
                      )
                    }
                  />

                  Bannissement définitif
                </label>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border p-3 text-sm text-gray-500">
                {!cibleUtilisateurId &&
                  "Le compte concerné n'est plus disponible."}

                {estCompteCourant &&
                  " Vous ne pouvez pas sanctionner votre propre compte."}

                {cibleProtegee &&
                  " Votre rôle ne permet pas de sanctionner cet utilisateur."}

                {sanctionActiveType &&
                  ` Cet utilisateur possède déjà une sanction active (${sanctionActiveType}).`}
              </div>
            )}
          </div>
        )}

        {/* JUSTIFICATION */}

        {decision && (
          <div className="mt-6">
            <label
              htmlFor="decision-commentaire"
              className="block text-sm font-semibold"
            >
              {decision ===
              "rejeter"
                ? "Justification du rejet"
                : sanction ===
                    "aucune" ||
                  !peutSanctionner
                  ? "Justification de la décision"
                  : "Justification de la sanction"}
            </label>

            <textarea
              id="decision-commentaire"
              value={
                commentaire
              }
              onChange={(
                event,
              ) =>
                setCommentaire(
                  event.target
                    .value,
                )
              }
              maxLength={1000}
              rows={4}
              placeholder={
                decision ===
                "rejeter"
                  ? "Expliquez pourquoi aucune infraction n'est retenue."
                  : "Expliquez l'infraction constatée et la décision prise."
              }
              className="
                mt-2
                w-full
                rounded-lg
                border
                bg-background
                p-3
              "
            />

            <p className="mt-1 text-xs text-gray-500">
              {
                commentaire.length
              }{" "}
              / 1000
            </p>
          </div>
        )}

        {/* VALIDATION */}

        <div className="mt-6 border-t pt-5">
          <button
            type="button"
            onClick={traiter}
            disabled={
              !decision ||
              loading
            }
            className="
              rounded-lg
              bg-[#8ED8B6]
              px-5
              py-2.5
              font-medium
              text-black
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {loading
              ? "Traitement..."
              : "Traiter le signalement"}
          </button>
        </div>
      </fieldset>

      {message && (
        <p className="mt-4 text-sm text-red-500">
          {message}
        </p>
      )}
    </section>
  );
}