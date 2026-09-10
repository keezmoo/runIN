"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AnnulerSortieButtonProps = {
  sortieId: string;
  titre: string;
};

export default function AnnulerSortieButton({
  sortieId,
  titre,
}: AnnulerSortieButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  async function annulerSortie() {
    const confirmation = window.confirm(`Annuler la sortie "${titre}" ?`);

    if (!confirmation) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("annuler_sortie", {
      p_sortie_id: sortieId,
    });

    if (error) {
      console.error("Erreur annulation sortie :", error);

      setMessage("Impossible d'annuler la sortie.");

      setLoading(false);
      return;
    }

    router.replace("/sorties");
  }

  return (
    <div>
      <Button
        type="button"
        variant="warning"
        onClick={annulerSortie}
        disabled={loading}
      >
        {loading ? "Annulation..." : "Annuler la sortie"}
      </Button>

      {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </div>
  );
}
