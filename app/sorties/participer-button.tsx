"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ParticiperButtonProps = {
  sortieId: string;
  userId: string;
  nombreMax: number;
  dejaParticipant: boolean;
  estOrganisateur: boolean;
  complet: boolean;
};

export default function ParticiperButton({
  sortieId,
  userId,
  nombreMax,
  dejaParticipant,
  estOrganisateur,
  complet,
}: ParticiperButtonProps) {

  const router = useRouter();

  const [participant, setParticipant] =
    useState(dejaParticipant);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function changerParticipation() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    // --------------------------------
    // CAS 1 : quitter une sortie
    // --------------------------------

    if (participant) {

      const { error } = await supabase
        .from("participations")
        .delete()
        .eq("sortie_id", sortieId)
        .eq("utilisateur_id", userId);

      if (error) {
        setMessage("Erreur : " + error.message);
        setLoading(false);
        return;
      }

      setParticipant(false);
      router.refresh();
      setLoading(false);
      return;
    }


    // --------------------------------
    // CAS 2 : participer
    // --------------------------------

    // Vérification du nombre de places
    const { count, error: countError } =
      await supabase
        .from("participations")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("sortie_id", sortieId);

    if (countError) {
      setMessage("Impossible de vérifier les places.");
      setLoading(false);
      return;
    }

    // +1 = organisateur
    const nombreActuel = (count ?? 0) + 1;

    if (nombreActuel >= nombreMax) {
      setMessage("Cette sortie est complète.");
      setLoading(false);

      router.refresh();
      return;
    }

    // Création de la participation
    const { error } = await supabase
      .from("participations")
      .insert({
        sortie_id: sortieId,
        utilisateur_id: userId,
      });

    if (error) {
      setMessage("Erreur : " + error.message);
    } else {
      setParticipant(true);
      router.refresh();
    }

    setLoading(false);
  }


  // L'organisateur participe automatiquement
  if (estOrganisateur) {
    return (
      <span className="text-sm font-medium">
        Vous organisez cette sortie
      </span>
    );
  }


  return (
    <div>
      <button
        type="button"
        onClick={changerParticipation}
        disabled={
          loading ||
          (!participant && complet)
        }
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
      >
        {loading
          ? "Chargement..."
          : participant
            ? "Quitter la sortie"
            : complet
              ? "Complet"
              : "Participer"}
      </button>

      {message && (
        <p className="mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
