"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  sortieId: string;
  titre: string;
  statut: string;
  estPassee: boolean;
  nombreParticipants: number;
  nombreMessages: number;

  retourApresSuppression?: string;
};

export default function ActionsSortie({
  sortieId,
  titre,
  statut,
  estPassee,
  nombreParticipants,
  nombreMessages,
  retourApresSuppression = "/admin/sorties",
}: Props) {
  const router = useRouter();

  const [motifAnnulation, setMotifAnnulation] = useState("");

  const [motifSuppression, setMotifSuppression] = useState("");

  const [confirmationSuppression, setConfirmationSuppression] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  function messageErreur(texte: string) {
    if (texte.includes("SORTIE_DEJA_ANNULEE")) {
      return "Cette sortie est déjà annulée.";
    }

    if (texte.includes("SORTIE_PASSEE")) {
      return "Une sortie passée ne peut plus être annulée.";
    }

    if (texte.includes("SORTIE_INTROUVABLE")) {
      return "Cette sortie n'existe plus.";
    }

    if (texte.includes("MOTIF_INVALIDE")) {
      return "Le motif doit contenir entre 3 et 1000 caractères.";
    }

    if (texte.includes("MFA_REQUIS")) {
      return "La session administrateur doit être validée avec le MFA.";
    }

    return "Impossible d'effectuer cette action.";
  }

  async function annulerSortie() {
    if (loading) {
      return;
    }

    const motif = motifAnnulation.trim();

    if (motif.length < 3) {
      setMessage("Indiquez un motif d'au moins 3 caractères.");

      return;
    }

    if (!window.confirm(`Annuler administrativement la sortie "${titre}" ?`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_annuler_sortie", {
      p_sortie_id: sortieId,

      p_motif: motif,
    });

    if (error) {
      console.error("Erreur annulation administrative sortie :", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      setMessage(messageErreur(error.message));

      setLoading(false);

      return;
    }

    setMotifAnnulation("");

    setMessage("Sortie annulée administrativement.");

    router.refresh();

    setLoading(false);
  }

  async function supprimerSortie() {
    if (loading) {
      return;
    }

    const motif = motifSuppression.trim();

    if (motif.length < 3) {
      setMessage("Indiquez un motif d'au moins 3 caractères.");

      return;
    }

    if (confirmationSuppression !== "SUPPRIMER") {
      setMessage('Saisissez exactement "SUPPRIMER" pour confirmer.');

      return;
    }

    if (
      !window.confirm(
        `Dernière confirmation : supprimer définitivement "${titre}" ?`,
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_supprimer_sortie", {
      p_sortie_id: sortieId,

      p_motif: motif,
    });

    if (error) {
      console.error("Erreur suppression administrative sortie :", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      setMessage(messageErreur(error.message));

      setLoading(false);

      return;
    }

    router.replace(retourApresSuppression);

    router.refresh();
  }

  return (
    <section
      className="
                rounded-xl
                border
                border-red-900/70
                p-5
            "
    >
      <h2 className="font-semibold">Actions administratives</h2>

      <p
        className="
                    mt-2
                    text-sm
                    text-gray-500
                "
      >
        Ces actions sont journalisées. L&apos;annulation doit être privilégiée à
        la suppression définitive.
      </p>

      {/* ANNULATION */}

      {statut === "planifiee" && !estPassee && (
        <div
          className="
                        mt-6
                        border-t
                        pt-5
                    "
        >
          <h3 className="font-medium">Annuler la sortie</h3>

          <p
            className="
                            mt-1
                            text-sm
                            text-gray-500
                        "
          >
            La sortie reste en base et dans les historiques.
          </p>

          <textarea
            value={motifAnnulation}
            onChange={(event) => setMotifAnnulation(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Motif de l'annulation administrative"
            className="
                            mt-3
                            w-full
                            rounded-lg
                            border
                            bg-background
                            p-3
                        "
          />

          <button
            type="button"
            disabled={loading}
            onClick={annulerSortie}
            className="
                            mt-3
                            rounded-lg
                            border
                            border-orange-700
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-orange-400
                            disabled:opacity-40
                        "
          >
            {loading ? "Traitement..." : "Annuler administrativement"}
          </button>
        </div>
      )}

      {/* SUPPRESSION */}

      <div
        className="
                    mt-6
                    border-t
                    pt-5
                "
      >
        <h3
          className="
                        font-medium
                        text-red-400
                    "
        >
          Supprimer définitivement
        </h3>

        <p
          className="
                        mt-2
                        text-sm
                        text-gray-500
                    "
        >
          Cette sortie contient actuellement {nombreParticipants} participant
          {nombreParticipants > 1 ? "s" : ""} et {nombreMessages} message
          {nombreMessages > 1 ? "s" : ""}.
        </p>

        <p
          className="
                        mt-2
                        text-sm
                        text-red-400
                    "
        >
          Cette opération est irréversible. Les données liées à la sortie
          peuvent être supprimées par cascade.
        </p>

        <textarea
          value={motifSuppression}
          onChange={(event) => setMotifSuppression(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Motif de la suppression définitive"
          className="
                        mt-4
                        w-full
                        rounded-lg
                        border
                        bg-background
                        p-3
                    "
        />

        <label
          className="
                        mt-4
                        block
                        text-sm
                    "
        >
          Saisissez <strong>SUPPRIMER</strong> pour confirmer
          <input
            type="text"
            value={confirmationSuppression}
            onChange={(event) => setConfirmationSuppression(event.target.value)}
            autoComplete="off"
            className="
                            mt-2
                            block
                            w-full
                            max-w-sm
                            rounded-lg
                            border
                            bg-background
                            px-3
                            py-2
                        "
          />
        </label>

        <button
          type="button"
          disabled={loading || confirmationSuppression !== "SUPPRIMER"}
          onClick={supprimerSortie}
          className="
                        mt-4
                        rounded-lg
                        bg-red-700
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-white
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                    "
        >
          {loading ? "Suppression..." : "Supprimer définitivement"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </section>
  );
}
