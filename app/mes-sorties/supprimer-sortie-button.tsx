"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SupprimerSortieButtonProps = {
  sortieId: string;
  titre: string;
};

export default function SupprimerSortieButton({
  sortieId,
  titre,
}: SupprimerSortieButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function supprimerSortie() {
    const confirmation = window.confirm(
      `Supprimer définitivement la sortie "${titre}" ?`,
    );

    if (!confirmation) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("supprimer_sortie_sans_interaction", {
      p_sortie_id: sortieId,
    });

    if (error) {
      console.error("Erreur suppression :", error);

      setMessage("Impossible de supprimer la sortie.");

      setLoading(false);
      return;
    }

    router.replace("/sorties");
  }

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        onClick={supprimerSortie}
        disabled={loading}
      >
        {loading ? "Suppression..." : "Supprimer"}
      </Button>

      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </div>
  );
}
