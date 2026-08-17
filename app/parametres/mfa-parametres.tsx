"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";


type FacteurTotp = {
    id: string;
    friendly_name?: string;
    status?: string;
};


export default function MfaParametres() {

    const supabase =
        createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );


    const [
        facteurActif,
        setFacteurActif,
    ] = useState<FacteurTotp | null>(null);


    const [
        chargement,
        setChargement,
    ] = useState(true);


    const [
        activationEnCours,
        setActivationEnCours,
    ] = useState(false);


    const [
        factorId,
        setFactorId,
    ] = useState("");


    const [
        qrCode,
        setQrCode,
    ] = useState("");


    const [
        secret,
        setSecret,
    ] = useState("");


    const [
        code,
        setCode,
    ] = useState("");


    const [
        erreur,
        setErreur,
    ] = useState("");


    const [
        message,
        setMessage,
    ] = useState("");


    const [
        afficherDesactivation,
        setAfficherDesactivation,
    ] = useState(false);


    const [
        desactivationEnCours,
        setDesactivationEnCours,
    ] = useState(false);

    async function chargerFacteurs() {

        setChargement(true);
        setErreur("");


        const {
            data,
            error,
        } =
            await supabase.auth.mfa.listFactors();


        if (error) {

            console.error(
                "Erreur chargement MFA :",
                error
            );

            setErreur(
                "Impossible de charger les paramètres MFA."
            );

            setChargement(false);

            return;
        }


        const facteur =
            data.totp.find(
                (item) =>
                    item.status === "verified"
            ) ?? null;


        setFacteurActif(facteur);

        setChargement(false);

    }


    useEffect(() => {

        chargerFacteurs();

    }, []);


    async function commencerActivation() {

        setErreur("");
        setMessage("");
        setCode("");


        const {
            data,
            error,
        } =
            await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "runIN",
            });


        if (error) {

            console.error(
                "Erreur enrollment MFA :",
                error
            );

            setErreur(
                "Impossible de démarrer l'activation du MFA."
            );

            return;
        }


        setFactorId(
            data.id
        );

        setQrCode(
            data.totp.qr_code
        );

        setSecret(
            data.totp.secret
        );

        setActivationEnCours(true);

    }


    async function confirmerActivation() {

        setErreur("");
        setMessage("");


        const codeNettoye =
            code
                .replace(/\s/g, "")
                .trim();


        if (!/^\d{6}$/.test(codeNettoye)) {

            setErreur(
                "Saisissez le code à 6 chiffres affiché dans votre application d'authentification."
            );

            return;
        }


        const {
            data: challengeData,
            error: challengeError,
        } =
            await supabase.auth.mfa.challenge({
                factorId,
            });


        if (challengeError) {

            console.error(
                "Erreur challenge MFA :",
                challengeError
            );

            setErreur(
                "Impossible de vérifier le code."
            );

            return;
        }


        const {
            error: verifyError,
        } =
            await supabase.auth.mfa.verify({
                factorId,
                challengeId:
                    challengeData.id,
                code:
                    codeNettoye,
            });


        if (verifyError) {

            console.error(
                "Erreur vérification MFA :",
                verifyError
            );

            setErreur(
                "Code incorrect ou expiré."
            );

            return;
        }


        setActivationEnCours(false);
        setFactorId("");
        setQrCode("");
        setSecret("");
        setCode("");

        setMessage(
            "Authentification à deux facteurs activée."
        );


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

        return (

            <p className="text-sm text-zinc-400">
                Chargement...
            </p>

        );

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

        const {
            data: aal,
            error: aalError,
        } =
            await supabase.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (aalError) {

            console.error(
                "Erreur vérification niveau MFA :",
                aalError
            );

            setErreur(
                "Impossible de vérifier le niveau de sécurité de la session."
            );

            setDesactivationEnCours(false);

            return;
        }


        if (
            aal.currentLevel !== "aal2"
        ) {

            setErreur(
                "Vous devez d'abord valider votre authentification à deux facteurs."
            );

            setDesactivationEnCours(false);

            return;
        }


        // ------------------------------------------------
        // Suppression du facteur TOTP
        // ------------------------------------------------

        const {
            error: unenrollError,
        } =
            await supabase.auth.mfa.unenroll({
                factorId:
                    facteurActif.id,
            });


        if (unenrollError) {

            console.error(
                "Erreur désactivation MFA :",
                unenrollError
            );

            setErreur(
                "Impossible de désactiver l'authentification à deux facteurs."
            );

            setDesactivationEnCours(false);

            return;
        }


        // ------------------------------------------------
        // Actualise immédiatement la session.
        //
        // Sans cela, le JWT peut temporairement rester
        // en AAL2 après la suppression du facteur.
        // ------------------------------------------------

        const {
            error: refreshError,
        } =
            await supabase.auth.refreshSession();


        if (refreshError) {

            console.error(
                "Erreur actualisation session après MFA :",
                refreshError
            );

        }


        setFacteurActif(null);
        setAfficherDesactivation(false);
        setDesactivationEnCours(false);

        setMessage(
            "Authentification à deux facteurs désactivée."
        );

    }


    if (facteurActif) {

        return (

            <div className="space-y-4">

                <div>

                    <p className="font-medium text-white">
                        Authentification à deux facteurs
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                        Votre compte est protégé par une
                        application d&apos;authentification.
                    </p>

                </div>


                <div
                    className="
                    inline-flex
                    rounded-full
                    border
                    border-emerald-900
                    bg-emerald-950/30
                    px-3
                    py-1
                    text-sm
                    text-emerald-400
                "
                >
                    Activé
                </div>


                {message && (

                    <p className="text-sm text-[#8ED8B6]">
                        {message}
                    </p>

                )}


                {erreur && (

                    <p className="text-sm text-red-400">
                        {erreur}
                    </p>

                )}


                {!afficherDesactivation && (

                    <div>

                        <button
                            type="button"
                            onClick={() =>
                                setAfficherDesactivation(true)
                            }
                            className="
                            rounded-lg
                            border
                            border-zinc-700
                            bg-zinc-800
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-white
                            hover:bg-zinc-700
                        "
                        >
                            Désactiver le MFA
                        </button>

                    </div>

                )}


                {afficherDesactivation && (

                    <div
                        className="
                        space-y-3
                        rounded-lg
                        border
                        border-red-900
                        bg-red-950/20
                        p-4
                    "
                    >

                        <div>

                            <p className="font-medium text-red-400">
                                Désactiver le MFA ?
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                                Votre compte ne demandera plus
                                de code depuis votre application
                                d&apos;authentification lors de
                                la connexion.
                            </p>

                        </div>


                        <div className="flex flex-wrap gap-3">

                            <button
                                type="button"
                                disabled={
                                    desactivationEnCours
                                }
                                onClick={() => {

                                    setAfficherDesactivation(
                                        false
                                    );

                                    setErreur("");

                                }}
                                className="
                                rounded-lg
                                border
                                border-zinc-700
                                bg-zinc-800
                                px-4
                                py-2
                                text-sm
                                text-white
                                hover:bg-zinc-700
                                disabled:opacity-50
                            "
                            >
                                Annuler
                            </button>


                            <button
                                type="button"
                                disabled={
                                    desactivationEnCours
                                }
                                onClick={
                                    desactiverMfa
                                }
                                className="
                                rounded-lg
                                bg-red-700
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-white
                                hover:bg-red-600
                                disabled:opacity-50
                            "
                            >
                                {desactivationEnCours
                                    ? "Désactivation..."
                                    : "Confirmer la désactivation"}
                            </button>

                        </div>

                    </div>

                )}

            </div>

        );

    }


    if (!activationEnCours) {

        return (

            <div className="space-y-3">

                <div>

                    <p className="font-medium text-white">
                        Authentification à deux facteurs
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                        Ajoutez une protection supplémentaire
                        à votre compte avec une application
                        d&apos;authentification.
                    </p>

                </div>


                {erreur && (

                    <p className="text-sm text-red-400">
                        {erreur}
                    </p>

                )}


                <button
                    type="button"
                    onClick={commencerActivation}
                    className="
                        rounded-lg
                        border
                        border-zinc-700
                        bg-zinc-800
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-white
                        hover:bg-zinc-700
                    "
                >
                    Activer le MFA
                </button>

            </div>

        );

    }


    return (

        <div className="space-y-4">

            <div>

                <p className="font-medium text-white">
                    Configurer le MFA
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                    Scannez ce QR code avec votre application
                    d&apos;authentification.
                </p>

            </div>


            {qrCode && (

                <div
                    className="
                        inline-block
                        rounded-lg
                        bg-white
                        p-3
                    "
                >

                    <img
                        src={qrCode}
                        alt="QR code MFA"
                        width={200}
                        height={200}
                    />

                </div>

            )}


            {secret && (

                <div>

                    <p className="text-sm text-zinc-400">
                        Si vous ne pouvez pas scanner le QR code,
                        saisissez cette clé manuellement :
                    </p>

                    <code
                        className="
                            mt-2
                            block
                            break-all
                            rounded-lg
                            bg-zinc-950
                            p-3
                            text-sm
                            text-zinc-200
                        "
                    >
                        {secret}
                    </code>

                </div>

            )}


            <div>

                <label
                    htmlFor="code-mfa"
                    className="block text-sm text-zinc-300"
                >
                    Code à 6 chiffres
                </label>


                <input
                    id="code-mfa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                        setCode(
                            event.target.value
                        )
                    }
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

                <p className="text-sm text-red-400">
                    {erreur}
                </p>

            )}


            <div className="flex flex-wrap gap-3">

                <button
                    type="button"
                    onClick={annulerActivation}
                    className="
                        rounded-lg
                        border
                        border-zinc-700
                        bg-zinc-800
                        px-4
                        py-2
                        text-sm
                        text-white
                        hover:bg-zinc-700
                    "
                >
                    Annuler
                </button>


                <button
                    type="button"
                    onClick={confirmerActivation}
                    className="
                        rounded-lg
                        bg-[#8ED8B6]
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-zinc-950
                    "
                >
                    Vérifier et activer
                </button>

            </div>

        </div>

    );

}