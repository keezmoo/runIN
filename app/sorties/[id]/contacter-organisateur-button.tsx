"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ContacterOrganisateurButtonProps = {
  sortieId: string;
};

export default function ContacterOrganisateurButton({
  sortieId,
}: ContacterOrganisateurButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  async function contacterOrganisateur() {
    setLoading(true);
    setMessage("");

    const { data: conversationId, error } = await supabase.rpc(
      "ouvrir_conversation_sortie",
      {
        p_sortie_id: sortieId,
      },
    );

    if (error || !conversationId) {
      const erreur = error?.message ?? "";

      if (erreur.includes("RELATION_BLOQUEE")) {
        setMessage("Cette conversation n'est pas disponible.");

        setLoading(false);

        router.refresh();

        return;
      }

      console.error("Erreur ouverture conversation :", error);

      setMessage("Impossible d'ouvrir la conversation.");

      setLoading(false);

      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={contacterOrganisateur}
        disabled={loading}
      >
        {loading ? "Ouverture..." : "Contacter l'organisateur"}
      </Button>

      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </div>
  );
}
