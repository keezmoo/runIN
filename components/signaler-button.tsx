"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  typeCible: "profil" | "sortie" | "message";
  cibleId: string;
  libelle: string;
  affichage?: "inline" | "modal";
};

export default function SignalerButton({
  typeCible,
  cibleId,
  libelle,
  affichage = "inline",
}: Props) {
  const [ouvert, setOuvert] = useState(false);

  const [motif, setMotif] = useState("");

  const [commentaire, setCommentaire] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  async function envoyer() {
    if (loading || !motif) {
      return;
    }

    const commentaireNettoye = commentaire.trim();

    if (commentaireNettoye && commentaireNettoye.length < 3) {
      setMessage("Le commentaire doit contenir au moins 3 caractères.");

      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } =
      typeCible === "message"
        ? await supabase.rpc("creer_signalement_message", {
            p_message_id: cibleId,

            p_motif: motif,

            p_commentaire: commentaireNettoye || null,
          })
        : await supabase.rpc("creer_signalement", {
            p_type_cible: typeCible,

            p_cible_id: cibleId,

            p_motif: motif,

            p_commentaire: commentaireNettoye || null,
          });

    if (error) {
      const texte = error.message ?? "";

      if (texte.includes("SIGNALEMENT_DEJA_EXISTANT")) {
        setMessage(
          "Vous avez déjà un signalement en cours concernant cet élément.",
        );
      } else if (texte.includes("TROP_DE_SIGNALEMENTS")) {
        setMessage("Vous avez envoyé trop de signalements récemment.");
      } else if (texte.includes("AUTO_SIGNALEMENT_INTERDIT")) {
        setMessage("Vous ne pouvez pas signaler votre propre contenu.");
      } else {
        console.error("Erreur signalement :", {
          code: error.code,

          message: error.message,

          details: error.details,

          hint: error.hint,
        });

        setMessage("Impossible d'envoyer le signalement.");
      }

      setLoading(false);

      return;
    }

    setMotif("");
    setCommentaire("");

    setMessage("Signalement envoyé.");

    setLoading(false);
  }

  if (!ouvert) {
    return (
      <Button
        type="button"
        variant="link"
        onClick={() => {
          setOuvert(true);
          setMessage("");
        }}
        className="
        h-auto
        p-0
        text-muted-foreground
        hover:text-destructive
      "
      >
        {libelle}
      </Button>
    );
  }

  const formulaire = (
    <div className="rounded-xl border bg-background p-4">
      <div
        className="
                    flex
                    items-center
                    justify-between
                    gap-4
                "
      >
        <p className="font-medium">Signaler</p>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOuvert(false);
            setMessage("");
          }}
          className="h-auto px-2 py-1 text-sm"
        >
          Fermer
        </Button>
      </div>

      <label
        className="
                    mt-4
                    block
                    text-sm
                    font-medium
                "
      >
        Motif
      </label>

      <select
        value={motif}
        onChange={(event) => setMotif(event.target.value)}
        className="
                    mt-1
                    w-full
                    rounded-lg
                    border
                    bg-background
                    px-3
                    py-2
                "
      >
        <option value="">Sélectionner</option>

        <option value="spam">Spam</option>

        <option value="harcelement">Harcèlement</option>

        <option value="contenu_inapproprie">Contenu inapproprié</option>

        <option value="faux_profil">Faux profil</option>

        <option value="comportement_dangereux">Comportement dangereux</option>

        <option value="autre">Autre</option>
      </select>

      <label
        className="
                    mt-4
                    block
                    text-sm
                    font-medium
                "
      >
        Commentaire facultatif
      </label>

      <textarea
        value={commentaire}
        onChange={(event) => setCommentaire(event.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Précisez le problème si nécessaire."
        className="
                    mt-1
                    w-full
                    rounded-lg
                    border
                    bg-background
                    p-3
                "
      />

      <p
        className="
                    mt-1
                    text-xs
                    text-muted-foreground
                "
      >
        {commentaire.length} / 1000
      </p>

      <Button
        type="button"
        variant="destructive"
        onClick={envoyer}
        disabled={loading || !motif}
        className="mt-4"
      >
        {loading ? "Envoi..." : "Envoyer le signalement"}
      </Button>

      {message && (
        <p
          className={
            message === "Signalement envoyé."
              ? "mt-3 text-sm text-primary-strong"
              : "mt-3 text-sm text-destructive"
          }
        >
          {message}
        </p>
      )}
    </div>
  );

  if (affichage === "modal") {
    return (
      <div
        className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        p-4
      "
        onClick={() => {
          setOuvert(false);
          setMessage("");
        }}
      >
        <div
          className="w-full max-w-md"
          onClick={(event) => event.stopPropagation()}
        >
          {formulaire}
        </div>
      </div>
    );
  }

  return formulaire;
}
