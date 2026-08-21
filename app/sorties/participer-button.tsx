"use client";

import { useEffect, useState } from "react";
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
  genreAutorise: boolean;
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
  genreAutorise,
}: ParticiperButtonProps) {
  const router = useRouter();

  const [supabase] = useState(() =>
    createClient()
  );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    demandeActive,
    setDemandeActive,
  ] = useState(demandeEnAttente);

  const [
    secondesCooldown,
    setSecondesCooldown,
  ] = useState(0);

  // ------------------------------------------------
  // Format du cooldown
  // ------------------------------------------------

  function formaterDureeCooldown(
    secondes: number
  ) {
    if (secondes >= 3600) {
      const heures =
        Math.ceil(secondes / 3600);

      return heures === 1
        ? "environ 1 heure"
        : `environ ${heures} heures`;
    }

    if (secondes >= 60) {
      const minutes =
        Math.ceil(secondes / 60);

      return `${minutes} min`;
    }

    return `${secondes} s`;
  }

  const blocageAntiSpam =
    secondesCooldown > 30;

  // ------------------------------------------------
  // CHARGER LE COOLDOWN
  // ------------------------------------------------

  async function chargerCooldown() {
    const {
      data,
      error,
    } = await supabase.rpc(
      "secondes_avant_reinscription_sortie",
      {
        p_sortie_id: sortieId,
      }
    );

    if (error) {
      console.error(
        "Erreur chargement cooldown :",
        error
      );

      return 0;
    }

    const secondes =
      typeof data === "number"
        ? data
        : 0;

    setSecondesCooldown(secondes);

    return secondes;
  }


  // ------------------------------------------------
  // CHARGEMENT INITIAL DU COOLDOWN
  // ------------------------------------------------

  useEffect(() => {
    let actif = true;

    async function charger() {
      const {
        data,
        error,
      } = await supabase.rpc(
        "secondes_avant_reinscription_sortie",
        {
          p_sortie_id: sortieId,
        }
      );

      if (
        actif &&
        !error
      ) {
        setSecondesCooldown(
          typeof data === "number"
            ? data
            : 0
        );
      }
    }

    void charger();

    return () => {
      actif = false;
    };
  }, [
    sortieId,
    supabase,
  ]);


  // ------------------------------------------------
  // COMPTE À REBOURS
  // ------------------------------------------------

  useEffect(() => {
    if (secondesCooldown <= 0) {
      return;
    }

    const timer =
      window.setTimeout(() => {

        setSecondesCooldown(
          (secondes) =>
            Math.max(
              0,
              secondes - 1
            )
        );

      }, 1000);


    return () => {
      window.clearTimeout(timer);
    };
  }, [secondesCooldown]);


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

    await chargerCooldown();

    return true;
  }


  // ------------------------------------------------
  // PARTICIPATION AUTOMATIQUE
  // ------------------------------------------------

  async function participerAutomatiquement() {

    if (secondesCooldown > 0) {
      setMessage(
        `Réinscription possible dans ${secondesCooldown} s.`
      );

      return false;
    }
   
    const { error } = await supabase.rpc(
      "rejoindre_sortie_automatique",
      {
        p_sortie_id: sortieId,
      }
    );


    if (error) {

      const erreur =
        error.message ?? "";


      // La page de B indique encore "automatique",
      // mais A vient de passer la sortie en validation.
      if (
        erreur.includes(
          "SORTIE_MODE_VALIDATION"
        )
      ) {
        setMessage(
          "Le mode d'inscription de cette sortie vient d'être modifié."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "SORTIE_COMPLETE"
        )
      ) {
        setMessage(
          "Cette sortie est complète."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "COOLDOWN_REINSCRIPTION"
        )
      ) {
        const secondes =
          await chargerCooldown();

        setMessage(
          `Réinscription possible dans ${secondes} s.`
        );

        return false;
      }


      if (
        erreur.includes(
          "UTILISATEUR_EXCLU"
        )
      ) {
        setMessage(
          "L'organisateur vous a retiré de cette sortie."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "SORTIE_INDISPONIBLE"
        )
      ) {
        setMessage(
          "Cette sortie n'est plus disponible."
        );

        router.refresh();

        return false;
      }

      if (
        erreur.includes(
          "GENRE_NON_AUTORISE"
        )
      ) {
        setMessage(
          "Vous ne faites plus partie des participants autorisés pour cette sortie."
        );

        router.refresh();

        return false;
      }

      console.error(
        "Erreur participation automatique :",
        error
      );

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

    if (secondesCooldown > 0) {
      setMessage(
        `Nouvelle demande possible dans ${secondesCooldown} s.`
      );

      return false;
    }


    if (complet) {
      setMessage(
        "Cette sortie est complète."
      );

      return false;
    }


    const { error } = await supabase.rpc(
      "demander_participation_sortie",
      {
        p_sortie_id: sortieId,
      }
    );


    if (error) {

      const erreur =
        error.message ?? "";


      // La page affiche encore le mode validation,
      // mais l'organisateur vient de passer
      // la sortie en inscription automatique.
      if (
        erreur.includes(
          "SORTIE_MODE_AUTOMATIQUE"
        )
      ) {
        setMessage(
          "Le mode d'inscription de cette sortie vient d'être modifié."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "SORTIE_COMPLETE"
        )
      ) {
        setMessage(
          "Cette sortie est complète."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "COOLDOWN_REINSCRIPTION"
        )
      ) {
        const secondes =
          await chargerCooldown();

        setMessage(
          `Nouvelle demande possible dans ${secondes} s.`
        );

        return false;
      }


      if (
        erreur.includes(
          "UTILISATEUR_EXCLU"
        )
      ) {
        setMessage(
          "L'organisateur vous a retiré de cette sortie."
        );

        router.refresh();

        return false;
      }


      if (
        erreur.includes(
          "SORTIE_INDISPONIBLE"
        )
      ) {
        setMessage(
          "Cette sortie n'est plus disponible."
        );

        router.refresh();

        return false;
      }

      if (
        erreur.includes(
          "GENRE_NON_AUTORISE"
        )
      ) {
        setMessage(
          "Vous ne faites plus partie des participants autorisés pour cette sortie."
        );

        router.refresh();

        return false;
      }

      console.error(
        "Erreur demande de participation :",
        error
      );

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

    await chargerCooldown();

    return true;
  }


  // ------------------------------------------------
  // ACTION DU BOUTON
  // ------------------------------------------------

  async function actionParticipation() {

    if (loading) {
      return;
    }


    setLoading(true);
    setMessage("");

    let succes = false;


    if (dejaParticipant) {

      succes =
        await quitterSortie();

    }

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
      <span className="font-medium">
        J&apos;organise
      </span>
    );
  }

  if (
    !genreAutorise &&
    !dejaParticipant &&
    !demandeActive
  ) {
    return (
      <div>
        <p className="font-medium">
          Cette sortie ne correspond pas
          aux participants autorisés par
          l&apos;organisateur.
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Vous ne pouvez pas vous inscrire
          à cette sortie.
        </p>
      </div>
    );
  }

  // ------------------------------------------------
  // DÉJÀ PARTICIPANT
  // ------------------------------------------------

  if (dejaParticipant) {
    return (
      <div className="flex items-center gap-2">

        <span className="text-sm font-medium">
          Je participe
        </span>

        <button
          type="button"
          onClick={actionParticipation}
          disabled={loading}
          className="
          rounded
          border
          border-white/50
          px-3
          py-2
          text-sm
          text-white
          disabled:opacity-40
        "
        >
          {loading
            ? "..."
            : "Quitter"}
        </button>

      </div>
    );
  }

  // ------------------------------------------------
  // DEMANDE EN ATTENTE
  // ------------------------------------------------

  if (
    modeInscription === "validation" &&
    demandeActive
  ) {
    return (
      <div className="flex items-center gap-2">

        <span className="text-sm font-medium">
          Demande envoyée
        </span>

        <button
          type="button"
          onClick={actionParticipation}
          disabled={loading}
          className="
          rounded
          border
          border-white/50
          px-3
          py-2
          text-sm
          text-white
          disabled:opacity-40
        "
        >
          {loading
            ? "..."
            : "Annuler"}
        </button>

      </div>
    );
  }

  // ------------------------------------------------
  // EST-CE UNE NOUVELLE INSCRIPTION ?
  // ------------------------------------------------

  const tenteNouvelleInscription =
    !dejaParticipant &&
    !demandeActive;


  // ------------------------------------------------
  // TEXTE DU BOUTON
  // ------------------------------------------------

  let texteBouton = "Participer";


  if (loading) {

    texteBouton =
      "Chargement...";

  } else if (
    blocageAntiSpam &&
    tenteNouvelleInscription
  ) {

    texteBouton =
      "Participation temporairement bloquée";

  } else if (
    secondesCooldown > 0 &&
    modeInscription === "validation"
  ) {

    texteBouton =
      `Nouvelle demande dans ${secondesCooldown} s`;

  } else if (
    secondesCooldown > 0
  ) {

    texteBouton =
      `Participer dans ${secondesCooldown} s`;

  } else if (complet) {

    texteBouton =
      "Complet";

  } else if (
    modeInscription === "validation"
  ) {

    texteBouton =
      "Demander à participer";

  }


  // ------------------------------------------------
  // BOUTON DÉSACTIVÉ ?
  // ------------------------------------------------

  const boutonDesactive =
    loading ||

    (
      secondesCooldown > 0 &&
      tenteNouvelleInscription
    ) ||

    (
      complet &&
      !dejaParticipant &&
      !demandeActive
    );


  // ------------------------------------------------
  // AFFICHAGE
  // ------------------------------------------------

  return (
    <div>

      <button
        type="button"
        onClick={actionParticipation}
        disabled={boutonDesactive}
        className="
  rounded
  border
  border-white/50
  bg-black
  px-3
  py-2
  text-sm
  text-white
  disabled:opacity-40
"
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


      {secondesCooldown > 0 &&
        tenteNouvelleInscription && (

          <div className="mt-2 text-sm">

            {blocageAntiSpam ? (

              <p className="text-red-500">
                Trop d&apos;actions rapprochées.
                Vous pourrez de nouveau participer à
                cette sortie dans{" "}
                {formaterDureeCooldown(
                  secondesCooldown
                )}.
              </p>

            ) : (

              <p className="text-gray-500">

                {modeInscription === "validation"
                  ? "Vous venez d'annuler votre demande. "
                  : "Vous venez de quitter cette sortie. "}

                {modeInscription === "validation"
                  ? `Nouvelle demande possible dans ${secondesCooldown} s.`
                  : `Réinscription possible dans ${secondesCooldown} s.`}

              </p>

            )}

          </div>

        )}


      {message && (
        <p className="mt-2 text-sm">
          {message}
        </p>
      )}

    </div>
  );
}