"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type BlocageUtilisateurButtonProps = {
  utilisateurId: string;
  mode: "bloquer" | "debloquer";
};

export default function BlocageUtilisateurButton({
  utilisateurId,
  mode,
}: BlocageUtilisateurButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function agir() {
    if (loading) {
      return;
    }

    if (mode === "bloquer") {
      const confirmation = window.confirm(
        "Bloquer ce membre ? Vous ne pourrez plus voir vos profils, vos sorties ni échanger de messages.",
      );

      if (!confirmation) {
        return;
      }
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      mode === "bloquer" ? "bloquer_utilisateur" : "debloquer_utilisateur",
      {
        p_utilisateur_id: utilisateurId,
      },
    );

    if (error) {
      console.error(
        mode === "bloquer"
          ? "Erreur blocage utilisateur :"
          : "Erreur déblocage utilisateur :",
        error,
      );

      setMessage(
        mode === "bloquer"
          ? "Impossible de bloquer ce membre."
          : "Impossible de débloquer ce membre.",
      );

      setLoading(false);
      return;
    }

    window.dispatchEvent(new Event("messages-non-lus-modifies"));

    window.dispatchEvent(new Event("notifications-non-lues-modifiees"));

    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={agir}
        disabled={loading}
        className="
          rounded
          border
          px-3
          py-2
          text-sm
          disabled:opacity-50
        "
      >
        {loading ? "..." : mode === "bloquer" ? "Bloquer" : "Débloquer"}
      </button>

      {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
    </div>
  );
}
