"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function destinationApresMfa() {
  if (typeof window === "undefined") {
    return "/sorties";
  }

  const params = new URLSearchParams(window.location.search);

  const prochainePage = params.get("next");

  // Empêche d'utiliser ce paramètre
  // pour rediriger vers un site externe.
  if (
    prochainePage &&
    prochainePage.startsWith("/") &&
    !prochainePage.startsWith("//")
  ) {
    return prochainePage;
  }

  return "/sorties";
}

export default function PageMfa() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [factorId, setFactorId] = useState("");

  const [code, setCode] = useState("");

  const [chargement, setChargement] = useState(true);

  const [verification, setVerification] = useState(false);

  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function initialiser() {
      setErreur("");

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error("Erreur niveau MFA :", aalError);

        setErreur("Impossible de vérifier l'état de sécurité du compte.");

        setChargement(false);

        return;
      }

      // Déjà authentifié avec le second facteur.
      if (aal.currentLevel === "aal2") {
        router.replace(destinationApresMfa());
        return;
      }

      // Aucun MFA nécessaire.
      if (aal.nextLevel !== "aal2") {
        router.replace(destinationApresMfa());
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        console.error("Erreur facteurs MFA :", factorsError);

        setErreur("Impossible de charger le second facteur.");

        setChargement(false);

        return;
      }

      const facteur = factors.totp.find((item) => item.status === "verified");

      if (!facteur) {
        setErreur("Aucun facteur MFA valide n'a été trouvé.");

        setChargement(false);

        return;
      }

      setFactorId(facteur.id);

      setChargement(false);
    }

    initialiser();
  }, [router, supabase]);

  async function verifierCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErreur("");

    const codeNettoye = code.replace(/\s/g, "").trim();

    if (!/^\d{6}$/.test(codeNettoye)) {
      setErreur("Saisissez un code à 6 chiffres.");

      return;
    }

    if (!factorId) {
      setErreur("Facteur MFA introuvable.");

      return;
    }

    setVerification(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: codeNettoye,
    });

    if (error) {
      // Un mauvais code MFA est une erreur utilisateur normale.
      // On l'affiche dans l'interface sans polluer la console.

      if (error.code === "mfa_verification_failed") {
        setErreur(
          "Code incorrect ou expiré. Vérifiez le code affiché dans votre application d'authentification.",
        );

        setVerification(false);

        return;
      }

      // Les autres erreurs sont inattendues
      // et restent utiles dans la console.

      console.error("Erreur inattendue lors de la vérification MFA :", {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      setErreur("Impossible de vérifier le code. Réessayez.");

      setVerification(false);

      return;
    }

    router.replace(destinationApresMfa());
    router.refresh();
  }

  if (chargement) {
    return (
      <main
        className="
                    mx-auto
                    max-w-md
                    px-4
                    py-10
                "
      >
        <p className="text-zinc-400">Vérification...</p>
      </main>
    );
  }

  return (
    <main
      className="
                mx-auto
                max-w-md
                px-4
                py-10
            "
    >
      <div
        className="
                    rounded-xl
                    border
                    border-zinc-800
                    bg-zinc-900
                    p-5
                "
      >
        <h1
          className="
                        text-xl
                        font-semibold
                        text-white
                    "
        >
          Vérification en deux étapes
        </h1>

        <p
          className="
                        mt-2
                        text-sm
                        text-zinc-400
                    "
        >
          Ouvrez votre application d&apos;authentification et saisissez le code
          à 6 chiffres.
        </p>

        <form onSubmit={verifierCode} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="code-mfa"
              className="
                                block
                                text-sm
                                text-zinc-300
                            "
            >
              Code de sécurité
            </label>

            <input
              id="code-mfa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
              className="
                                mt-2
                                w-full
                                rounded-lg
                                border
                                border-zinc-700
                                bg-zinc-950
                                px-3
                                py-2
                                text-white
                                outline-none
                                focus:border-[#8ED8B6]
                            "
            />
          </div>

          {erreur && (
            <p
              className="
                                text-sm
                                text-red-400
                            "
            >
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={verification || code.length !== 6}
            className="
                            w-full
                            rounded-lg
                            bg-[#8ED8B6]
                            px-4
                            py-2
                            font-medium
                            text-zinc-950
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                        "
          >
            {verification ? "Vérification..." : "Continuer"}
          </button>
        </form>
      </div>
    </main>
  );
}
