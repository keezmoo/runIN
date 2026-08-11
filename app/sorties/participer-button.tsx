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

  modeInscription: string;
  demandeEnAttente: boolean;
};

export default function ParticiperButton({
  sortieId,
  userId,
  nombreMax,
  dejaParticipant,
  estOrganisateur,
  complet,
  modeInscription,
  demandeEnAttente,
}: ParticiperButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    demandeActive,
    setDemandeActive,
  ] = useState(demandeEnAttente);


  // ------------------------------------------------
  // QUITTER UNE SORTIE
  // ------------------------------------------------

  async function quitterSortie() {
    const { error } = await supabase
      .from("participations")
      .delete()
      .eq("sortie_id", sortieId)
      .eq("utilisateur_id", userId);

    if (error) {
      setMessage(
        "Impossible de quitter la sortie."
      );
      return false;
    }

    return true;
  }


  // ------------------------------------------------
  // PARTICIPATION AUTOMATIQUE
  // ------------------------------------------------

  async function participerAutomatiquement() {

    // Vérifie combien de personnes sont déjà inscrites
    const {
      count,
      error: countError,
    } = await supabase
      .from("participations")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("sortie_id", sortieId);

    if (countError) {
      setMessage(
        "Impossible de vérifier les participants."
      );
      return false;
    }

    // +1 car l'organisateur compte
    const nombreActuel =
      (count ?? 0) + 1;

    if (nombreActuel >= nombreMax) {
      setMessage(
        "Cette sortie est complète."
      );
      return false;
    }

    const { error } = await supabase
      .from("participations")
      .insert({
        sortie_id: sortieId,
        utilisateur_id: userId,
      });

    if (error) {
      setMessage(
        "Impossible de rejoindre la sortie."
      );
      return false;
    }

    return true;
  }


  // ------------------------------------------------
  // DEMANDER À PARTICIPER
  // ------------------------------------------------

  async function demanderParticipation() {

    if (complet) {
      setMessage(
        "Cette sortie est complète."
      );
      return false;
    }

    const { error } = await supabase
      .from("demandes_participation")
      .insert({
        sortie_id: sortieId,
        utilisateur_id: userId,
        statut: "en_attente",
      });

    if (error) {
      setMessage(
        "Impossible d'envoyer la demande."
      );
      return false;
    }

    setDemandeActive(true);

    return true;
  }


  // ------------------------------------------------
  // ANNULER UNE DEMANDE
  // ------------------------------------------------

  async function annulerDemande() {

    const { error } = await supabase
      .from("demandes_participation")
      .delete()
      .eq("sortie_id", sortieId)
      .eq("utilisateur_id", userId)
      .eq("statut", "en_attente");

    if (error) {
      setMessage(
        "Impossible d'annuler la demande."
      );
      return false;
    }

    setDemandeActive(false);

    return true;
  }


  // ------------------------------------------------
  // ACTION DU BOUTON
  // ------------------------------------------------

  async function actionParticipation() {

    setLoading(true);
    setMessage("");

    let succes = false;


    // Déjà inscrit → quitter
    if (dejaParticipant) {

      succes =
        await quitterSortie();

    }

    // Sortie avec validation
    else if (
      modeInscription === "validation"
    ) {

      if (demandeActive) {

        succes =
          await annulerDemande();

      } else {

        succes =
          await demanderParticipation();

      }

    }

    // Sortie automatique
    else {

      succes =
        await participerAutomatiquement();

    }


    setLoading(false);

    if (succes) {
      router.refresh();
    }
  }


  // ------------------------------------------------
  // ORGANISATEUR
  // ------------------------------------------------

  if (estOrganisateur) {
    return (
      <p className="text-sm font-medium">
        Vous organisez cette sortie
      </p>
    );
  }


  // ------------------------------------------------
  // TEXTE DU BOUTON
  // ------------------------------------------------

  let texteBouton = "Participer";

  if (loading) {

    texteBouton = "Chargement...";

  } else if (dejaParticipant) {

    texteBouton = "Quitter";

  } else if (
    modeInscription === "validation" &&
    demandeActive
  ) {

    texteBouton = "Annuler ma demande";

  } else if (
    modeInscription === "validation"
  ) {

    texteBouton =
      "Demander à participer";

  } else if (complet) {

    texteBouton = "Complet";

  }


  const boutonDesactive =
    loading ||
    (
      complet &&
      !dejaParticipant &&
      !demandeActive
    );


  return (
    <div>

      <button
        type="button"
        onClick={actionParticipation}
        disabled={boutonDesactive}
        className="rounded border px-4 py-2 disabled:opacity-40"
      >
        {texteBouton}
      </button>


      {demandeActive &&
        !dejaParticipant && (
          <p className="mt-2 text-sm text-gray-500">
            En attente de validation par
            l&apos;organisateur.
          </p>
        )}


      {message && (
        <p className="mt-2 text-sm">
          {message}
        </p>
      )}

    </div>
  );
}