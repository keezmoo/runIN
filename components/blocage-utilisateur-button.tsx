"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant={mode === "bloquer" ? "destructive" : "outline"}
        onClick={agir}
        disabled={loading}
      >
        {loading ? "..." : mode === "bloquer" ? "Bloquer" : "Débloquer"}
      </Button>

      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </div>
  );
}
