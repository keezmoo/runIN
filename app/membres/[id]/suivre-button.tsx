"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type SuivreButtonProps = {
  profilId: string;
  estSuiviInitialement: boolean;
};

export default function SuivreButton({
  profilId,
  estSuiviInitialement,
}: SuivreButtonProps) {
  const router = useRouter();

  const [estSuivi, setEstSuivi] = useState(estSuiviInitialement);

  const [loading, setLoading] = useState(false);

  async function basculerSuivi() {
    if (loading) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    if (estSuivi) {
      const { error } = await supabase
        .from("suivis")
        .delete()
        .eq("utilisateur_id", user.id)
        .eq("profil_suivi_id", profilId);

      if (error) {
        console.error("Erreur suppression suivi :", error);

        setLoading(false);
        return;
      }

      setEstSuivi(false);
    } else {
      const { error } = await supabase.from("suivis").insert({
        utilisateur_id: user.id,
        profil_suivi_id: profilId,
      });

      if (error) {
        console.error("Erreur ajout suivi :", error);

        setLoading(false);
        return;
      }

      setEstSuivi(true);
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant={estSuivi ? "outline" : "default"}
      onClick={basculerSuivi}
      disabled={loading}
      className="shrink-0"
    >
      {loading ? "..." : estSuivi ? "✓ Suivi" : "Suivre"}
    </Button>
  );
}
