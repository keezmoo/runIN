"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function NotificationsEmailButton() {
  const [actif, setActif] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  // ------------------------------------------------
  // CHARGEMENT DE LA PRÉFÉRENCE
  // ------------------------------------------------

  useEffect(() => {
    async function chargerPreference() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("notifications_email_activees")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Erreur chargement préférence e-mail :",
          error,
        );

        return;
      }

      if (!data) {
        // Le compte Auth existe mais le profil
        // n'a pas encore été créé.
        return;
      }

      setActif(data.notifications_email_activees);
    }

    chargerPreference();
  }, []);

  // ------------------------------------------------
  // ACTIVATION / DÉSACTIVATION
  // ------------------------------------------------

  async function basculerPreference() {
    if (
      userId === null ||
      actif === null ||
      chargement
    ) {
      return;
    }

    setChargement(true);
    setErreur("");

    const nouvelleValeur = !actif;

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        notifications_email_activees: nouvelleValeur,
      })
      .eq("id", userId);

    if (error) {
      console.error(
        "Erreur modification préférence e-mail :",
        error,
      );

      setErreur(
        "Impossible de modifier la préférence.",
      );

      setChargement(false);

      return;
    }

    setActif(nouvelleValeur);
    setChargement(false);
  }

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  if (actif === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            E-mails de notification
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {actif
              ? "Vous recevez actuellement les notifications par e-mail."
              : "Les notifications par e-mail sont désactivées."}
          </p>
        </div>

        <Button
          type="button"
          variant={actif ? "outline" : "default"}
          onClick={basculerPreference}
          disabled={chargement}
          className="shrink-0"
        >
          {chargement
            ? "Enregistrement..."
            : actif
              ? "Désactiver"
              : "Activer"}
        </Button>
      </div>

      {erreur && (
        <p className="mt-3 text-sm text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}