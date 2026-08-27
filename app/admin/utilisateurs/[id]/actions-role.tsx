"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  utilisateurId: string;
  nom: string;

  role: string;
  roleConnecte: string;

  estCompteCourant: boolean;
};

function normaliserRole(role: string) {
  if (role === "moderateur" || role === "administrateur") {
    return role;
  }

  return "utilisateur";
}

export default function ActionsRole({
  utilisateurId,
  nom,
  role,
  roleConnecte,
  estCompteCourant,
}: Props) {
  const router = useRouter();

  const roleActuel = normaliserRole(role);

  const estAdministrateurConnecte = roleConnecte === "administrateur";

  const [nouveauRole, setNouveauRole] = useState(roleActuel);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  // Si la fiche est rafraîchie après modification,
  // on synchronise le select avec la nouvelle valeur.
  useEffect(() => {
    setNouveauRole(roleActuel);
  }, [roleActuel]);

  async function enregistrer() {
    if (
      loading ||
      !estAdministrateurConnecte ||
      estCompteCourant ||
      nouveauRole === roleActuel
    ) {
      return;
    }

    let confirmation = `Modifier le rôle de ${nom} ?`;

    if (nouveauRole === "moderateur") {
      confirmation = `Attribuer le rôle de modérateur à ${nom} ?`;
    }

    if (nouveauRole === "administrateur") {
      confirmation = `Attribuer les droits d'administrateur à ${nom} ?`;
    }

    if (roleActuel === "administrateur" && nouveauRole !== "administrateur") {
      confirmation = `Retirer les droits d'administrateur à ${nom} ?`;
    }

    if (!window.confirm(confirmation)) {
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_definir_role_moderation", {
      p_utilisateur_id: utilisateurId,

      p_role: nouveauRole,
    });

    if (error) {
      const erreur = error.message ?? "";

      if (erreur.includes("MODIFICATION_ROLE_PROPRE_INTERDITE")) {
        setMessage("Vous ne pouvez pas modifier votre propre rôle.");
      } else if (erreur.includes("DERNIER_ADMINISTRATEUR")) {
        setMessage("Le dernier administrateur ne peut pas être rétrogradé.");
      } else if (erreur.includes("MFA_REQUIS")) {
        setMessage("Une validation MFA est nécessaire.");
      } else if (erreur.includes("ACCES_ADMIN_REFUSE")) {
        setMessage("Seul un administrateur peut modifier les rôles.");
      } else {
        console.error("Erreur modification rôle :", {
          code: error.code,

          message: error.message,

          details: error.details,

          hint: error.hint,
        });

        setMessage("Impossible de modifier le rôle.");
      }

      setLoading(false);

      return;
    }

    setMessage("Rôle modifié.");

    router.refresh();

    setLoading(false);
  }

  return (
    <section
      className="
                rounded-xl
                border
                p-5
            "
    >
      <h2 className="font-semibold">Rôle</h2>

      <div
        className="
                    mt-4
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-end
                "
      >
        <div className="flex-1">
          <label
            htmlFor="role-utilisateur"
            className="
                            mb-1
                            block
                            text-sm
                            font-medium
                        "
          >
            Rôle global
          </label>

          <select
            id="role-utilisateur"
            value={nouveauRole}
            disabled={!estAdministrateurConnecte || estCompteCourant || loading}
            onChange={(event) => setNouveauRole(event.target.value)}
            className="
                            w-full
                            rounded-lg
                            border
                            bg-background
                            px-3
                            py-2

                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
          >
            <option value="utilisateur">Utilisateur</option>

            <option value="moderateur">Modérateur</option>

            <option value="administrateur">Administrateur</option>
          </select>
        </div>

        {estAdministrateurConnecte && !estCompteCourant && (
          <button
            type="button"
            onClick={enregistrer}
            disabled={loading || nouveauRole === roleActuel}
            className="
                            rounded-lg
                            bg-[#8ED8B6]
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-black

                            disabled:cursor-not-allowed
                            disabled:opacity-40
                        "
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        )}
      </div>

      {!estAdministrateurConnecte && (
        <p
          className="
                        mt-3
                        text-sm
                        text-gray-500
                    "
        >
          Seul un administrateur peut modifier les rôles.
        </p>
      )}

      {estCompteCourant && estAdministrateurConnecte && (
        <p
          className="
                        mt-3
                        text-sm
                        text-gray-500
                    "
        >
          Vous ne pouvez pas modifier votre propre rôle.
        </p>
      )}

      {message && <p className="mt-3 text-sm">{message}</p>}
    </section>
  );
}
