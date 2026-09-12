"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  const lectureAutomatiqueTerminee = useRef(false);

  const pageQuittee = useRef(false);

  // ------------------------------------------------
  // LECTURE AUTOMATIQUE
  // ------------------------------------------------
  //
  // Les notifications sont enregistrées comme lues
  // en base dès que la page est consultée.
  //
  // On ne rafraîchit volontairement PAS la page :
  // elles conservent donc leur apparence "nouvelle"
  // pendant toute cette visite.
  //
  // Lorsque l'utilisateur quitte la page,
  // le badge de la cloche est actualisé.
  // ------------------------------------------------

  useEffect(() => {
    pageQuittee.current = false;
    lectureAutomatiqueTerminee.current = false;

    if (nombreNonLues === 0) {
      return;
    }

    const supabase = createClient();

    async function enregistrerLectureAutomatique() {
      const { error } = await supabase.rpc(
        "marquer_toutes_notifications_visibles_lues",
      );

      if (error) {
        console.error("Erreur lecture automatique des notifications :", error);

        return;
      }

      lectureAutomatiqueTerminee.current = true;

      // Si l'utilisateur a quitté la page
      // pendant que la requête terminait,
      // on actualise quand même la cloche.
      if (pageQuittee.current) {
        window.dispatchEvent(new Event("notifications-non-lues-modifiees"));
      }
    }

    void enregistrerLectureAutomatique();

    return () => {
      pageQuittee.current = true;

      if (lectureAutomatiqueTerminee.current) {
        window.dispatchEvent(new Event("notifications-non-lues-modifiees"));
      }
    };
  }, [nombreNonLues]);

  // ------------------------------------------------
  // BOUTON MANUEL
  // ------------------------------------------------

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

    window.dispatchEvent(new Event("notifications-non-lues-modifiees"));

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
