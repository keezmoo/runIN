"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ToutMarquerLuButtonProps = {
  nombreNonLues: number;
};

export default function ToutMarquerLuButton({
  nombreNonLues,
}: ToutMarquerLuButtonProps) {
  const router = useRouter();

  const [chargement, setChargement] = useState(false);

  const [erreur, setErreur] = useState("");

  async function toutMarquerCommeLu() {
    if (chargement || nombreNonLues === 0) {
      return;
    }

    setChargement(true);
    setErreur("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "marquer_toutes_notifications_visibles_lues",
    );

    if (error) {
      console.error("Erreur lecture notifications :", error);

      setErreur("Impossible de marquer les notifications comme lues.");

      setChargement(false);

      return;
    }

    // Actualise le badge de navigation
    window.dispatchEvent(new Event("notifications-non-lues-modifiees"));

    // Actualise la page Server Component
    router.refresh();

    setChargement(false);
  }

  if (nombreNonLues === 0) {
    return null;
  }

  return (
    <div className="text-right">
      <Button
        type="button"
        variant="outline"
        onClick={toutMarquerCommeLu}
        disabled={chargement}
        className="h-auto px-3 py-2 text-sm"
      >
        {chargement ? "Traitement..." : "Tout marquer comme lu"}
      </Button>

      {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
