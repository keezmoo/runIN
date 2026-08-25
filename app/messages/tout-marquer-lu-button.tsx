"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ToutMarquerLuButtonProps = {
  conversationIds: string[];
};

export default function ToutMarquerLuButton({
  conversationIds,
}: ToutMarquerLuButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  async function toutMarquerCommeLu() {
    if (
      loading ||
      conversationIds.length === 0
    ) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const resultats =
      await Promise.all(
        conversationIds.map(
          (conversationId) =>
            supabase.rpc(
              "marquer_messages_comme_lus",
              {
                p_conversation_id:
                  conversationId,
              },
            ),
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
      new Event(
        "messages-non-lus-modifies",
      ),
    );

    router.refresh();

    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toutMarquerCommeLu}
      disabled={loading}
      className="
        text-sm
        font-medium
        text-gray-500
        transition
        hover:text-current
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      {loading
        ? "Lecture..."
        : "Tout marquer comme lu"}
    </button>
  );
}