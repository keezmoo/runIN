"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  utilisateurId: string;
  nom: string;
  role: string;

  sanctionActiveId: string | null;
  sanctionActiveType: string | null;
  roleConnecte: string;
  estCompteCourant: boolean;
};

export default function ActionsSanction({
  utilisateurId,
  nom,
  role,
  sanctionActiveId,
  sanctionActiveType,
  roleConnecte,
}: Props) {
  const router = useRouter();

  const [type, setType] = useState<"suspension" | "bannissement">("suspension");

  const [duree, setDuree] = useState("7");

  const [motif, setMotif] = useState("");

  const [motifLevee, setMotifLevee] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const cibleProtegee =
    role === "administrateur" ||
    (roleConnecte === "moderateur" && role === "moderateur");

  function messageErreur(texte: string) {
    if (texte.includes("AUTO_SANCTION_INTERDITE")) {
      return "Vous ne pouvez pas sanctionner votre propre compte.";
    }

    if (texte.includes("ADMINISTRATEUR_PROTEGE")) {
      return "Un administrateur ne peut pas être sanctionné depuis cette interface.";
    }

    if (texte.includes("CIBLE_HIERARCHIQUE_PROTEGEE")) {
      return "Vous n'avez pas l'autorisation de sanctionner cet utilisateur.";
    }

    if (texte.includes("SANCTION_DEJA_ACTIVE")) {
      return "Cet utilisateur possède déjà une sanction active.";
    }

    if (texte.includes("MOTIF_INVALIDE")) {
      return "Le motif doit contenir entre 3 et 1000 caractères.";
    }

    if (texte.includes("DUREE_SUSPENSION_INVALIDE")) {
      return "La durée de suspension est invalide.";
    }

    if (texte.includes("MFA_REQUIS")) {
      return "Votre session administrateur doit être validée avec le MFA.";
    }

    return "Impossible d'effectuer cette action.";
  }

  async function sanctionner() {
    if (loading) {
      return;
    }

    const motifNettoye = motif.trim();

    if (motifNettoye.length < 3) {
      setMessage("Indiquez un motif d'au moins 3 caractères.");

      return;
    }

    if (type === "bannissement") {
      const confirmation = window.confirm(`Bannir définitivement ${nom} ?`);

      if (!confirmation) {
        return;
      }
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_sanctionner_utilisateur", {
      p_utilisateur_id: utilisateurId,

      p_type: type,

      p_motif: motifNettoye,

      p_duree_jours: type === "suspension" ? Number(duree) : null,
    });

    if (error) {
      console.error("Erreur sanction utilisateur :", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      setMessage(messageErreur(error.message));

      setLoading(false);

      return;
    }

    setMotif("");
    setMessage("Sanction enregistrée.");

    router.refresh();

    setLoading(false);
  }

  async function leverSanction() {
    if (loading || !sanctionActiveId) {
      return;
    }

    const motifNettoye = motifLevee.trim();

    if (motifNettoye.length < 3) {
      setMessage("Indiquez la raison de la levée de sanction.");

      return;
    }

    const confirmation = window.confirm("Lever cette sanction ?");

    if (!confirmation) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_lever_sanction", {
      p_sanction_id: sanctionActiveId,

      p_motif: motifNettoye,
    });

    if (error) {
      console.error("Erreur levée sanction :", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      setMessage(messageErreur(error.message));

      setLoading(false);

      return;
    }

    setMotifLevee("");

    setMessage("Sanction levée.");

    router.refresh();

    setLoading(false);
  }

  if (cibleProtegee) {
    return (
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Sanctions</h2>

        <p
          className="
                    mt-2
                    text-sm
                    text-muted-foreground
                "
        >
          {role === "administrateur"
            ? "Un administrateur ne peut pas être sanctionné depuis cette interface."
            : "Un modérateur ne peut pas sanctionner un autre modérateur."}
        </p>
      </section>
    );
  }

  if (sanctionActiveId) {
    return (
      <section
        className="
                    rounded-xl
                    border
                    p-5
                "
      >
        <h2 className="font-semibold">Actions administratives</h2>

        <p
          className="
                        mt-2
                        text-sm
                        text-muted-foreground
                    "
        >
          Une{" "}
          {sanctionActiveType === "bannissement"
            ? "mesure de bannissement"
            : "suspension"}{" "}
          est actuellement active.
        </p>

        <div className="mt-4">
          <label
            className="
                            mb-1
                            block
                            text-sm
                            font-medium
                        "
          >
            Raison de la levée
          </label>

          <textarea
            value={motifLevee}
            onChange={(event) => setMotifLevee(event.target.value)}
            maxLength={1000}
            rows={3}
            className="
                            w-full
                            rounded-lg
                            border
                            bg-background
                            p-3
                        "
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={leverSanction}
          disabled={loading}
          className="mt-4"
        >
          {loading ? "Traitement..." : "Lever la sanction"}
        </Button>

        {message && <p className="mt-3 text-sm">{message}</p>}
      </section>
    );
  }

  return (
    <section
      className="
                rounded-xl
                border
                p-5
            "
    >
      <h2 className="font-semibold">Actions administratives</h2>

      <div
        className="
                    mt-4
                    grid
                    gap-4
                    sm:grid-cols-2
                "
      >
        <div>
          <label
            className="
                            mb-1
                            block
                            text-sm
                            font-medium
                        "
          >
            Sanction
          </label>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as "suspension" | "bannissement")
            }
            className="
                            w-full
                            rounded-lg
                            border
                            bg-background
                            px-3
                            py-2
                        "
          >
            <option value="suspension">Suspension temporaire</option>

            <option value="bannissement">Bannissement définitif</option>
          </select>
        </div>

        {type === "suspension" && (
          <div>
            <label
              className="
                                mb-1
                                block
                                text-sm
                                font-medium
                            "
            >
              Durée
            </label>

            <select
              value={duree}
              onChange={(event) => setDuree(event.target.value)}
              className="
                                w-full
                                rounded-lg
                                border
                                bg-background
                                px-3
                                py-2
                            "
            >
              <option value="1">1 jour</option>

              <option value="3">3 jours</option>

              <option value="7">7 jours</option>

              <option value="14">14 jours</option>

              <option value="30">30 jours</option>

              <option value="90">90 jours</option>

              <option value="365">1 an</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label
          className="
                        mb-1
                        block
                        text-sm
                        font-medium
                    "
        >
          Motif
        </label>

        <textarea
          value={motif}
          onChange={(event) => setMotif(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Indiquez précisément la raison de la sanction."
          className="
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
          {motif.length} / 1000
        </p>
      </div>

      <Button
        type="button"
        variant={type === "bannissement" ? "destructive" : "warning"}
        onClick={sanctionner}
        disabled={loading}
        className="mt-4"
      >
        {loading
          ? "Traitement..."
          : type === "bannissement"
            ? "Bannir l'utilisateur"
            : "Suspendre l'utilisateur"}
      </Button>

      {message && (
        <p
          className={
            message === "Sanction enregistrée." || message === "Sanction levée."
              ? "mt-3 text-sm text-primary-strong"
              : "mt-3 text-sm text-destructive"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}
