"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <p className="text-sm text-muted-foreground">Vérification...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Vérification en deux étapes
            </CardTitle>

            <CardDescription>
              Ouvrez votre application d&apos;authentification et saisissez le
              code à 6 chiffres.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={verifierCode} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="code-mfa">Code de sécurité</Label>

                <Input
                  id="code-mfa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoFocus
                />
              </div>

              {erreur && <p className="text-sm text-destructive">{erreur}</p>}

              <Button
                type="submit"
                disabled={verification || code.replace(/\s/g, "").length !== 6}
                className="w-full"
              >
                {verification ? "Vérification..." : "Continuer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
