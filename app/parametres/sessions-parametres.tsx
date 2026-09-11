"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SessionsParametres() {
  const router = useRouter();

  const [chargementAutres, setChargementAutres] = useState(false);

  const [chargementToutes, setChargementToutes] = useState(false);

  const [message, setMessage] = useState("");

  const [erreur, setErreur] = useState("");

  async function deconnecterAutresSessions() {
    setErreur("");
    setMessage("");
    setChargementAutres(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut({
      scope: "others",
    });

    if (error) {
      console.error("Erreur déconnexion autres sessions :", error);

      setErreur("Impossible de déconnecter les autres appareils.");

      setChargementAutres(false);

      return;
    }

    setMessage("Les autres sessions ont été déconnectées.");

    setChargementAutres(false);
  }

  async function deconnecterToutesSessions() {
    setErreur("");
    setMessage("");
    setChargementToutes(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut({
      scope: "global",
    });

    if (error) {
      console.error("Erreur déconnexion globale :", error);

      setErreur("Impossible de déconnecter les sessions.");

      setChargementToutes(false);

      return;
    }

    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium">Sessions connectées</p>

        <p className="mt-1 text-sm text-muted-foreground">
          Gérez les connexions de votre compte sur vos autres appareils et
          navigateurs.
        </p>
      </div>

      {message && <p className="text-sm text-primary-strong">{message}</p>}

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={deconnecterAutresSessions}
          disabled={chargementAutres || chargementToutes}
        >
          {chargementAutres
            ? "Déconnexion..."
            : "Déconnecter les autres appareils"}
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={deconnecterToutesSessions}
          disabled={chargementAutres || chargementToutes}
        >
          {chargementToutes
            ? "Déconnexion..."
            : "Déconnecter tous les appareils"}
        </Button>
      </div>
    </div>
  );
}
