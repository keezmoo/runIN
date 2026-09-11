"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SuppressionCompte() {
  const [confirmation, setConfirmation] = useState("");

  const [afficherConfirmation, setAfficherConfirmation] = useState(false);

  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const [erreur, setErreur] = useState("");

  const confirmationCorrecte = confirmation === "SUPPRIMER";

  async function supprimerCompte() {
    if (!confirmationCorrecte) {
      return;
    }

    setErreur("");
    setSuppressionEnCours(true);

    try {
      const response = await fetch("/api/compte/supprimer", {
        method: "DELETE",
      });

      const resultat = await response.json();

      if (!response.ok) {
        setErreur(resultat.error ?? "Impossible de supprimer le compte.");

        setSuppressionEnCours(false);

        return;
      }

      // Nettoyage de la session locale dans
      // le navigateur après suppression du compte.

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );

      await supabase.auth.signOut({
        scope: "local",
      });

      window.location.replace("/auth/login?compte=supprime");
    } catch (error) {
      console.error("Erreur suppression compte :", error);

      setErreur("Une erreur inattendue est survenue.");

      setSuppressionEnCours(false);
    }
  }

  if (!afficherConfirmation) {
    return (
      <div className="space-y-3">
        <div>
          <p className="font-medium">Supprimer mon compte</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Cette action supprime définitivement votre compte et les données qui
            lui sont associées.
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={() => setAfficherConfirmation(true)}
        >
          Supprimer mon compte
        </Button>
      </div>
    );
  }

  return (
    <div
      className="
      space-y-4
      rounded-xl
      border
      border-destructive/30
      bg-destructive/5
      p-4
    "
    >
      <div>
        <p className="font-medium text-destructive">
          Suppression définitive du compte
        </p>

        <p className="mt-2 text-sm font-medium">
          Cette action est irréversible.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Vos sorties, participations, demandes, conversations, messages et
          autres données liées au compte seront supprimés.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmation-suppression"
          className="block text-sm font-medium"
        >
          Pour confirmer, écrivez <strong>SUPPRIMER</strong>
        </label>

        <Input
          id="confirmation-suppression"
          type="text"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={suppressionEnCours}
          className="mt-2"
        />
      </div>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAfficherConfirmation(false);
            setConfirmation("");
            setErreur("");
          }}
          disabled={suppressionEnCours}
        >
          Annuler
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={supprimerCompte}
          disabled={!confirmationCorrecte || suppressionEnCours}
        >
          {suppressionEnCours ? "Suppression..." : "Supprimer définitivement"}
        </Button>
      </div>
    </div>
  );
}
