"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContacterParticipantButton from "./contacter-participant-button";
import { createClient } from "@/lib/supabase/client";

type GererDemandeButtonsProps = {
  demandeId: string;
  sortieId: string;
  utilisateurId: string;
};

export default function GererDemandeButtons({
  demandeId,
  sortieId,
  utilisateurId,
}: GererDemandeButtonsProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function accepter() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "accepter_demande_participation",
      {
        p_demande_id: demandeId,
      }
    );

    if (error) {
      setMessage(
        error.message.includes("complete")
          ? "La sortie est complète."
          : "Impossible d'accepter la demande."
      );

      setLoading(false);
      return;
    }

    router.refresh();
  }

  async function refuser() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "refuser_demande_participation",
      {
        p_demande_id: demandeId,
      }
    );

    if (error) {
      setMessage(
        "Impossible de refuser la demande."
      );

      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2">

        <ContacterParticipantButton
          sortieId={sortieId}
          utilisateurId={utilisateurId}
        />

        <button
          type="button"
          onClick={accepter}
          disabled={loading}
          className="rounded bg-[#8ED8B6] px-3 py-2 text-black disabled:opacity-40"
        >
          Accepter
        </button>

        <button
          type="button"
          onClick={refuser}
          disabled={loading}
          className="rounded border px-3 py-2 disabled:opacity-40"
        >
          Refuser
        </button>

      </div>

      {message && (
        <p className="mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}