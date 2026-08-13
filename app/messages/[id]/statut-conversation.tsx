"use client";

import {
  useEffect,
  useState,
} from "react";


type StatutConversationProps = {
  statutSortie: string;
  dateFinEstimee: string;
  dateCloture: string;
};


function afficherTempsRestant(
  millisecondes: number
) {

  const totalMinutes =
    Math.max(
      0,
      Math.ceil(
        millisecondes / 60000
      )
    );


  const heures =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;


  if (heures === 0) {
    return `${minutes} min`;
  }


  if (minutes === 0) {
    return `${heures} h`;
  }


  return `${heures} h ${minutes} min`;
}


export default function StatutConversation({
  statutSortie,
  dateFinEstimee,
  dateCloture,
}: StatutConversationProps) {

  const [
    maintenant,
    setMaintenant,
  ] = useState(
    () => Date.now()
  );


  useEffect(() => {

    const intervalle =
      window.setInterval(
        () => {
          setMaintenant(
            Date.now()
          );
        },
        60_000
      );


    return () => {
      window.clearInterval(
        intervalle
      );
    };

  }, []);


  const fin =
    new Date(
      dateFinEstimee
    ).getTime();


  const cloture =
    new Date(
      dateCloture
    ).getTime();


  // Sortie annulée :
  // fermeture immédiate
  if (
    statutSortie ===
    "annulee"
  ) {
    return (
      <div
        className="
          mb-4
          rounded-lg
          border
          p-3
          text-sm
        "
      >
        Cette sortie a été annulée.
        La conversation est fermée.
      </div>
    );
  }


  // Conversation expirée
  if (
    maintenant >
    cloture
  ) {
    return (
      <div
        className="
          mb-4
          rounded-lg
          border
          p-3
          text-sm
        "
      >
        Cette conversation est
        maintenant fermée.
      </div>
    );
  }


  // Sortie terminée mais
  // période de 12 h encore active
  if (
    maintenant >
    fin
  ) {

    const tempsRestant =
      cloture - maintenant;


    return (
      <div
        className="
          mb-4
          rounded-lg
          border
          p-3
          text-sm
        "
      >
        <p className="font-medium">
          La sortie est terminée.
        </p>

        <p className="mt-1">
          Cette conversation restera
          ouverte encore{" "}
          <strong>
            {afficherTempsRestant(
              tempsRestant
            )}
          </strong>.
        </p>
      </div>
    );
  }


  // Sortie pas encore terminée :
  // aucun avertissement
  return null;
}