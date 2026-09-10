"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContacterParticipantButton from "./contacter-participant-button";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  async function accepter() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("accepter_demande_participation", {
      p_demande_id: demandeId,
    });

    if (error) {
      const erreur = error.message ?? "";

      if (erreur.includes("RELATION_BLOQUEE")) {
        setMessage("Cette demande n'est plus disponible.");

        router.refresh();

        setLoading(false);
        return;
      }

      setMessage(
        erreur.toLowerCase().includes("complete")
          ? "La sortie est complète."
          : "Impossible d'accepter la demande.",
      );

      setLoading(false);
      return;
    }

    router.refresh();
  }

  async function refuser() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("refuser_demande_participation", {
      p_demande_id: demandeId,
    });

    if (error) {
      setMessage("Impossible de refuser la demande.");

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

        <Button type="button" size="sm" onClick={accepter} disabled={loading}>
          Accepter
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refuser}
          disabled={loading}
        >
          Refuser
        </Button>
      </div>

      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </div>
  );
}
