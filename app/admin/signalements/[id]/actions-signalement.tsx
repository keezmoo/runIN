"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  signalementId: string;

  statut: string;

  assigneA: string | null;

  assigneNom: string | null;

  utilisateurConnecteId: string;
};

export default function ActionsSignalement({
  signalementId,
  statut,
  assigneA,
  assigneNom,
  utilisateurConnecteId,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [commentaire, setCommentaire] = useState("");

  const [message, setMessage] = useState("");

  const estClos = statut === "traite" || statut === "rejete";

  const estAssigneAMoi = assigneA === utilisateurConnecteId;

  const estAssigneAutre =
    statut === "en_cours" && Boolean(assigneA) && !estAssigneAMoi;

  async function prendreEnCharge() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_prendre_signalement", {
      p_signalement_id: signalementId,
    });

    if (error) {
      const texte = error.message ?? "";

      if (texte.includes("SIGNALEMENT_DEJA_PRIS_EN_CHARGE")) {
        setMessage(
          "Ce signalement est déjà pris en charge par un autre gestionnaire.",
        );
      } else if (texte.includes("SIGNALEMENT_DEJA_CLOTURE")) {
        setMessage("Ce signalement a déjà été clôturé.");
      } else {
        console.error("Erreur prise en charge signalement :", {
          code: error.code,

          message: error.message,

          details: error.details,

          hint: error.hint,
        });

        setMessage("Impossible de prendre en charge ce signalement.");
      }

      setLoading(false);

      return;
    }

    router.refresh();

    setLoading(false);
  }

  async function clore(decision: "traite" | "rejete") {
    if (loading) {
      return;
    }

    const commentaireNettoye = commentaire.trim();

    if (commentaireNettoye.length < 3) {
      setMessage("Indiquez la raison de votre décision.");

      return;
    }

    const libelle =
      decision === "traite"
        ? "marquer ce signalement comme traité"
        : "rejeter ce signalement";

    if (!window.confirm(`Confirmer : ${libelle} ?`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_clore_signalement", {
      p_signalement_id: signalementId,

      p_decision: decision,

      p_commentaire: commentaireNettoye,
    });

    if (error) {
      const texte = error.message ?? "";

      if (texte.includes("SIGNALEMENT_PRIS_PAR_AUTRE")) {
        setMessage(
          "Ce signalement est pris en charge par un autre gestionnaire.",
        );
      } else if (texte.includes("SIGNALEMENT_DEJA_CLOTURE")) {
        setMessage("Ce signalement a déjà été clôturé.");
      } else if (texte.includes("COMMENTAIRE_DECISION_INVALIDE")) {
        setMessage(
          "La justification doit contenir entre 3 et 1000 caractères.",
        );
      } else {
        console.error("Erreur clôture signalement :", {
          code: error.code,

          message: error.message,

          details: error.details,

          hint: error.hint,
        });

        setMessage("Impossible de clôturer le signalement.");
      }

      setLoading(false);

      return;
    }

    setCommentaire("");

    router.refresh();

    setLoading(false);
  }

  if (estClos) {
    return (
      <section
        className="
                    rounded-xl
                    border
                    p-5
                "
      >
        <h2 className="font-semibold">Traitement</h2>

        <p
          className="
                        mt-2
                        text-sm
                        text-gray-500
                    "
        >
          Ce signalement est clôturé.
        </p>
      </section>
    );
  }

  return (
    <section
      className="
                rounded-xl
                border
                p-5
            "
    >
      <h2 className="font-semibold">Traitement</h2>

      {statut === "ouvert" && (
        <div className="mt-4">
          <button
            type="button"
            onClick={prendreEnCharge}
            disabled={loading}
            className="
                            rounded-lg
                            border
                            px-4
                            py-2
                            text-sm
                            font-medium
                            disabled:opacity-40
                        "
          >
            {loading ? "Chargement..." : "Prendre en charge"}
          </button>
        </div>
      )}

      {estAssigneAMoi && (
        <p
          className="
                        mt-4
                        text-sm
                        text-[#8ED8B6]
                    "
        >
          Vous avez pris en charge ce signalement.
        </p>
      )}

      {estAssigneAutre && (
        <p
          className="
                        mt-4
                        text-sm
                        text-gray-500
                    "
        >
          Ce signalement est pris en charge par{" "}
          {assigneNom ?? "un autre gestionnaire"}.
        </p>
      )}

      {!estAssigneAutre && (
        <>
          <div className="mt-5">
            <label
              htmlFor="decision-commentaire"
              className="
                                block
                                text-sm
                                font-medium
                            "
            >
              Justification de la décision
            </label>

            <textarea
              id="decision-commentaire"
              value={commentaire}
              onChange={(event) => setCommentaire(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Expliquez brièvement pourquoi le signalement est traité ou rejeté."
              className="
                                mt-1
                                w-full
                                rounded-lg
                                border
                                bg-background
                                p-3
                            "
            />

            <p
              className="
                                mt-1
                                text-xs
                                text-gray-500
                            "
            >
              {commentaire.length}
              {" / 1000"}
            </p>
          </div>

          <div
            className="
                            mt-4
                            flex
                            flex-wrap
                            gap-3
                        "
          >
            <button
              type="button"
              onClick={() => clore("traite")}
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
              Marquer comme traité
            </button>

            <button
              type="button"
              onClick={() => clore("rejete")}
              disabled={loading}
              className="
                                rounded-lg
                                border
                                px-4
                                py-2
                                text-sm
                                disabled:opacity-40
                            "
            >
              Rejeter le signalement
            </button>
          </div>
        </>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}
    </section>
  );
}
