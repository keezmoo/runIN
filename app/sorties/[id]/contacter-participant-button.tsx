"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ContacterParticipantButtonProps = {
  sortieId: string;
  utilisateurId: string;
};

export default function ContacterParticipantButton({
  sortieId,
  utilisateurId,
}: ContacterParticipantButtonProps) {
  const router = useRouter();

  const [chargement, setChargement] = useState(false);

  const [erreur, setErreur] = useState("");

  async function contacter() {
    setChargement(true);
    setErreur("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "ouvrir_conversation_participant",
      {
        p_sortie_id: sortieId,

        p_utilisateur_id: utilisateurId,
      },
    );

    if (error) {
      const messageErreur = error.message ?? "";

      if (messageErreur.includes("RELATION_BLOQUEE")) {
        setErreur("Ce profil n'est pas disponible.");

        setChargement(false);

        router.refresh();

        return;
      }

      console.error("Erreur ouverture conversation participant :", error);

      setErreur("Impossible d'ouvrir la conversation.");

      setChargement(false);

      return;
    }

    if (!data) {
      setErreur("Impossible d'ouvrir la conversation.");

      setChargement(false);

      return;
    }

    router.push(`/messages/${data}`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={contacter}
        disabled={chargement}
        className="
                    rounded
                    border
                    px-3
                    py-2
                    text-sm
                    disabled:opacity-50
                "
      >
        {chargement ? "Ouverture..." : "Contacter"}
      </button>

      {erreur && <p className="mt-2 text-sm">{erreur}</p>}
    </div>
  );
}
