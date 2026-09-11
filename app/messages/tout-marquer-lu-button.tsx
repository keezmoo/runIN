"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type ToutMarquerLuButtonProps = {
  conversationIds: string[];
};

export default function ToutMarquerLuButton({
  conversationIds,
}: ToutMarquerLuButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function toutMarquerCommeLu() {
    if (loading || conversationIds.length === 0) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const resultats = await Promise.all(
      conversationIds.map((conversationId) =>
        supabase.rpc("marquer_messages_comme_lus", {
          p_conversation_id: conversationId,
        }),
      ),
    );

    const erreur = resultats.find(
      (resultat) => resultat.error,
    )?.error;

    if (erreur) {
      console.error(
        "Erreur lecture des messages :",
        erreur,
      );
    }

    window.dispatchEvent(
      new Event("messages-non-lus-modifies"),
    );

    router.refresh();

    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toutMarquerCommeLu}
      disabled={loading}
      className="h-auto px-3 py-2 text-sm"
    >
      {loading ? "Lecture..." : "Tout marquer comme lu"}
    </Button>
  );
}