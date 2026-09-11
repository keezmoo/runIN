"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FacteurTotp = {
  id: string;
  friendly_name?: string;
  status?: string;
};

export default function MfaParametres() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );
  const [facteurActif, setFacteurActif] = useState<FacteurTotp | null>(null);

  const [chargement, setChargement] = useState(true);

  const [activationEnCours, setActivationEnCours] = useState(false);

  const [factorId, setFactorId] = useState("");

  const [qrCode, setQrCode] = useState("");

  const [secret, setSecret] = useState("");

  const [code, setCode] = useState("");

  const [erreur, setErreur] = useState("");

  const [message, setMessage] = useState("");

  const [afficherDesactivation, setAfficherDesactivation] = useState(false);

  const [desactivationEnCours, setDesactivationEnCours] = useState(false);

  async function chargerFacteurs() {
    setChargement(true);
    setErreur("");

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("Erreur chargement MFA :", error);

      setErreur("Impossible de charger les paramètres MFA.");

      setChargement(false);

      return;
    }

    const facteur =
      data.totp.find((item) => item.status === "verified") ?? null;

    setFacteurActif(facteur);

    setChargement(false);
  }

  useEffect(() => {
    let actif = true;

    async function chargerFacteursInitiaux() {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (!actif) {
        return;
      }

      if (error) {
        console.error("Erreur chargement MFA :", error);
        setErreur("Impossible de charger les paramètres MFA.");
        setChargement(false);
        return;
      }

      const facteur =
        data.totp.find((item) => item.status === "verified") ?? null;

      setFacteurActif(facteur);
      setChargement(false);
    }

    void chargerFacteursInitiaux();

    return () => {
      actif = false;
    };
  }, [supabase]);

  async function commencerActivation() {
    setErreur("");
    setMessage("");
    setCode("");

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "runIN",
    });

    if (error) {
      console.error("Erreur enrollment MFA :", error);

      setErreur("Impossible de démarrer l'activation du MFA.");

      return;
    }

    setFactorId(data.id);

    setQrCode(data.totp.qr_code);

    setSecret(data.totp.secret);

    setActivationEnCours(true);
  }

  async function confirmerActivation() {
    setErreur("");
    setMessage("");

    const codeNettoye = code.replace(/\s/g, "").trim();

    if (!/^\d{6}$/.test(codeNettoye)) {
      setErreur(
        "Saisissez le code à 6 chiffres affiché dans votre application d'authentification.",
      );

      return;
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      console.error("Erreur challenge MFA :", challengeError);

      setErreur("Impossible de vérifier le code.");

      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: codeNettoye,
    });

    if (verifyError) {
      if (verifyError.code === "mfa_verification_failed") {
        setErreur("Code incorrect ou expiré.");

        return;
      }

      console.error("Erreur inattendue lors de la vérification MFA :", {
        message: verifyError.message,
        code: verifyError.code,
        status: verifyError.status,
      });

      setErreur("Impossible de vérifier le code. Réessayez.");

      return;
    }

    setActivationEnCours(false);
    setFactorId("");
    setQrCode("");
    setSecret("");
    setCode("");

    setMessage("Authentification à deux facteurs activée.");

    await chargerFacteurs();
  }

  async function annulerActivation() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({
        factorId,
      });
    }

    setActivationEnCours(false);
    setFactorId("");
    setQrCode("");
    setSecret("");
    setCode("");
    setErreur("");
  }

  if (chargement) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  async function desactiverMfa() {
    if (!facteurActif) {
      return;
    }

    setErreur("");
    setMessage("");
    setDesactivationEnCours(true);

    // ------------------------------------------------
    // Vérifie que la session est bien en AAL2
    // ------------------------------------------------

    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      console.error("Erreur vérification niveau MFA :", aalError);

      setErreur("Impossible de vérifier le niveau de sécurité de la session.");

      setDesactivationEnCours(false);

      return;
    }

    if (aal.currentLevel !== "aal2") {
      setErreur(
        "Vous devez d'abord valider votre authentification à deux facteurs.",
      );

      setDesactivationEnCours(false);

      return;
    }

    // ------------------------------------------------
    // Suppression du facteur TOTP
    // ------------------------------------------------

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: facteurActif.id,
    });

    if (unenrollError) {
      console.error("Erreur désactivation MFA :", unenrollError);

      setErreur("Impossible de désactiver l'authentification à deux facteurs.");

      setDesactivationEnCours(false);

      return;
    }

    // ------------------------------------------------
    // Actualise immédiatement la session.
    //
    // Sans cela, le JWT peut temporairement rester
    // en AAL2 après la suppression du facteur.
    // ------------------------------------------------

    const { error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error("Erreur actualisation session après MFA :", refreshError);
    }

    setFacteurActif(null);
    setAfficherDesactivation(false);
    setDesactivationEnCours(false);

    setMessage("Authentification à deux facteurs désactivée.");
  }

  if (facteurActif) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">Authentification à deux facteurs</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Votre compte est protégé par une application
            d&apos;authentification.
          </p>
        </div>

        <div
          className="
          inline-flex
          rounded-full
          border
          border-primary-strong/30
          bg-primary/10
          px-3
          py-1
          text-sm
          font-medium
          text-primary-strong
        "
        >
          Activé
        </div>

        {message && <p className="text-sm text-primary-strong">{message}</p>}

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}

        {!afficherDesactivation && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAfficherDesactivation(true)}
          >
            Désactiver le MFA
          </Button>
        )}

        {afficherDesactivation && (
          <div
            className="
            space-y-4
            rounded-xl
            border
            border-destructive/30
            bg-destructive/5
            p-4
          "
          >
            <div>
              <p className="font-medium text-destructive">
                Désactiver le MFA ?
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Votre compte ne demandera plus de code depuis votre application
                d&apos;authentification lors de la connexion.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={desactivationEnCours}
                onClick={() => {
                  setAfficherDesactivation(false);
                  setErreur("");
                }}
              >
                Annuler
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={desactivationEnCours}
                onClick={desactiverMfa}
              >
                {desactivationEnCours
                  ? "Désactivation..."
                  : "Confirmer la désactivation"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activationEnCours) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">Authentification à deux facteurs</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez une protection supplémentaire à votre compte avec une
            application d&apos;authentification.
          </p>
        </div>

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}

        <Button type="button" variant="outline" onClick={commencerActivation}>
          Activer le MFA
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium">Configurer le MFA</p>

        <p className="mt-1 text-sm text-muted-foreground">
          Scannez ce QR code avec votre application d&apos;authentification.
        </p>
      </div>

      {qrCode && (
        <div className="inline-block rounded-xl border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR code MFA" width={200} height={200} />
        </div>
      )}

      {secret && (
        <div>
          <p className="text-sm text-muted-foreground">
            Si vous ne pouvez pas scanner le QR code, saisissez cette clé
            manuellement :
          </p>

          <code
            className="
            mt-2
            block
            break-all
            rounded-lg
            border
            bg-muted
            p-3
            text-sm
          "
          >
            {secret}
          </code>
        </div>
      )}

      <div>
        <label htmlFor="code-mfa" className="mb-1.5 block text-sm font-medium">
          Code à 6 chiffres
        </label>

        <Input
          id="code-mfa"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="max-w-48"
        />
      </div>

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={annulerActivation}>
          Annuler
        </Button>

        <Button type="button" onClick={confirmerActivation}>
          Vérifier et activer
        </Button>
      </div>
    </div>
  );
}
