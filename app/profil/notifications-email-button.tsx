"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type PreferencesEmail = {
  activees: boolean;
  participations: boolean;
  sorties: boolean;
  messages_reseau: boolean;
};

type ClePreference = keyof PreferencesEmail;

export default function NotificationsEmailButton() {
  const [preferences, setPreferences] = useState<PreferencesEmail | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [preferenceEnCours, setPreferenceEnCours] =
    useState<ClePreference | null>(null);

  const [erreur, setErreur] = useState("");

  // ------------------------------------------------
  // CHARGEMENT
  // ------------------------------------------------

  useEffect(() => {
    let actif = true;

    async function chargerPreferences() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!actif || !user) {
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("preferences_notifications_email")
        .select(
          `
         activees,
         participations,
          sorties,
          messages_reseau
         `,
        )
        .eq("utilisateur_id", user.id)
        .maybeSingle();

      if (!actif) {
        return;
      }

      if (error) {
        console.error("Erreur chargement préférences e-mail :", error);

        setErreur("Impossible de charger les préférences e-mail.");

        return;
      }

      if (!data) {
        setErreur("Les préférences e-mail sont introuvables.");

        return;
      }

      setPreferences(data);
    }

    void chargerPreferences();

    return () => {
      actif = false;
    };
  }, []);

  // ------------------------------------------------
  // MODIFICATION
  // ------------------------------------------------

  async function basculerPreference(cle: ClePreference) {
    if (!preferences || !userId || preferenceEnCours !== null) {
      return;
    }

    const nouvelleValeur = !preferences[cle];

    setPreferenceEnCours(cle);
    setErreur("");

    const supabase = createClient();

    const { error } = await supabase
      .from("preferences_notifications_email")
      .update({
        [cle]: nouvelleValeur,
      })
      .eq("utilisateur_id", userId);

    if (error) {
      console.error("Erreur modification préférence e-mail :", error);

      setErreur("Impossible de modifier la préférence.");

      setPreferenceEnCours(null);

      return;
    }

    setPreferences((actuelles) =>
      actuelles
        ? {
            ...actuelles,
            [cle]: nouvelleValeur,
          }
        : actuelles,
    );

    setPreferenceEnCours(null);
  }

  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  if (!preferences && !erreur) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (!preferences) {
    return <p className="text-sm text-destructive">{erreur}</p>;
  }

  return (
    <div className="space-y-5">
      {/* REGLAGE GENERAL */}

      <div
        className="
    rounded-lg
    border
    border-primary-strong/25
    bg-primary/5
    p-4
  "
      >
        <p
          className="
      mb-2
      text-xs
      font-semibold
      uppercase
      tracking-wide
      text-primary-strong
    "
        >
          Réglage général
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">Recevoir des e-mails de notification</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Active ou désactive tous les e-mails de notification runIN.
            </p>
          </div>

          <Button
            type="button"
            variant={preferences.activees ? "default" : "outline"}
            aria-pressed={preferences.activees}
            disabled={preferenceEnCours !== null}
            onClick={() => void basculerPreference("activees")}
            className="shrink-0"
          >
            {preferenceEnCours === "activees"
              ? "Enregistrement..."
              : preferences.activees
                ? "Activés"
                : "Désactivés"}
          </Button>
        </div>
      </div>

      {/* CATEGORIES */}

      <div>
        <p className="mb-4 text-sm font-semibold">Types d&apos;e-mails</p>

        <div
          className={
            preferences.activees ? "space-y-5" : "space-y-5 opacity-45"
          }
        >
          {/* PARTICIPATIONS */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Participations et demandes</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Demandes reçues et réponses à vos demandes de participation.
              </p>
            </div>

            <Button
              type="button"
              variant={
                preferences.activees && preferences.participations
                  ? "default"
                  : "outline"
              }
              aria-pressed={preferences.participations}
              disabled={!preferences.activees || preferenceEnCours !== null}
              onClick={() => void basculerPreference("participations")}
              className="shrink-0"
            >
              {preferenceEnCours === "participations"
                ? "Enregistrement..."
                : preferences.activees && preferences.participations
                  ? "Activés"
                  : "Désactivés"}
            </Button>
          </div>

          <div className="border-t" />

          {/* SORTIES */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Modifications de sorties</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Modifications et annulations des sorties auxquelles vous
                participez.
              </p>
            </div>

            <Button
              type="button"
              variant={
                preferences.activees && preferences.sorties
                  ? "default"
                  : "outline"
              }
              aria-pressed={preferences.sorties}
              disabled={!preferences.activees || preferenceEnCours !== null}
              onClick={() => void basculerPreference("sorties")}
              className="shrink-0"
            >
              {preferenceEnCours === "sorties"
                ? "Enregistrement..."
                : preferences.activees && preferences.sorties
                  ? "Activés"
                  : "Désactivés"}
            </Button>
          </div>

          <div className="border-t" />

          {/* MESSAGES ET RESEAU */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Messages et réseau</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Nouveaux messages et nouveaux abonnés.
              </p>
            </div>

            <Button
              type="button"
              variant={
                preferences.activees && preferences.messages_reseau
                  ? "default"
                  : "outline"
              }
              aria-pressed={preferences.messages_reseau}
              disabled={!preferences.activees || preferenceEnCours !== null}
              onClick={() => void basculerPreference("messages_reseau")}
              className="shrink-0"
            >
              {preferenceEnCours === "messages_reseau"
                ? "Enregistrement..."
                : preferences.activees && preferences.messages_reseau
                  ? "Activés"
                  : "Désactivés"}
            </Button>
          </div>
        </div>
      </div>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
