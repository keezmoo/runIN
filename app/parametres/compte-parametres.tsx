"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import { createClient } from "@/lib/supabase/client";


export default function CompteParametres() {

    const [
        email,
        setEmail,
    ] = useState("");


    const [
        nouveauMotDePasse,
        setNouveauMotDePasse,
    ] = useState("");


    const [
        confirmation,
        setConfirmation,
    ] = useState("");


    const [
        message,
        setMessage,
    ] = useState("");


    const [
        erreur,
        setErreur,
    ] = useState("");


    const [
        chargement,
        setChargement,
    ] = useState(false);

    const [
        nouvelEmail,
        setNouvelEmail,
    ] = useState("");


    const [
        messageEmail,
        setMessageEmail,
    ] = useState("");


    const [
        erreurEmail,
        setErreurEmail,
    ] = useState("");


    const [
        chargementEmail,
        setChargementEmail,
    ] = useState(false);

    useEffect(() => {

        async function chargerUtilisateur() {

            const supabase =
                createClient();


            const {
                data,
            } =
                await supabase.auth.getUser();


            setEmail(
                data.user?.email ?? ""
            );

        }


        chargerUtilisateur();

    }, []);


    async function modifierMotDePasse(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        setMessage("");
        setErreur("");


        if (
            nouveauMotDePasse.length < 8
        ) {

            setErreur(
                "Le mot de passe doit contenir au moins 8 caractères."
            );

            return;
        }


        if (
            nouveauMotDePasse !==
            confirmation
        ) {

            setErreur(
                "Les deux mots de passe ne correspondent pas."
            );

            return;
        }


        setChargement(true);


        const supabase =
            createClient();


        const {
            error,
        } =
            await supabase.auth.updateUser({
                password:
                    nouveauMotDePasse,
            });


        setChargement(false);


        if (error) {

            console.error(
                "Erreur modification mot de passe :",
                error
            );

            setErreur(
                "Impossible de modifier le mot de passe."
            );

            return;
        }


        setNouveauMotDePasse("");
        setConfirmation("");

        setMessage(
            "Mot de passe modifié."
        );

    }

    async function modifierEmail(
        event: FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        setMessageEmail("");
        setErreurEmail("");


        const emailNettoye =
            nouvelEmail
                .trim()
                .toLowerCase();


        if (!emailNettoye) {

            setErreurEmail(
                "Saisissez une nouvelle adresse e-mail."
            );

            return;
        }


        if (
            emailNettoye ===
            email.toLowerCase()
        ) {

            setErreurEmail(
                "Cette adresse est déjà utilisée par votre compte."
            );

            return;
        }


        setChargementEmail(true);


        const supabase =
            createClient();


        const {
            error,
        } =
            await supabase.auth.updateUser({
                email: emailNettoye,
            });


        setChargementEmail(false);


        if (error) {

            console.error(
                "Erreur modification e-mail :",
                error
            );

            setErreurEmail(
                "Impossible de modifier l'adresse e-mail."
            );

            return;
        }


        setNouvelEmail("");

        setMessageEmail(
            "Demande envoyée. Confirmez le changement depuis les e-mails envoyés à votre ancienne et à votre nouvelle adresse."
        );

    }

    return (
        <div className="space-y-6">

            {/* E-MAIL */}

            <div>

                <p className="text-sm font-medium">
                    Adresse e-mail
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                    {email || "Chargement..."}
                </p>

            </div>

            <form
                onSubmit={modifierEmail}
                className="space-y-3"
            >

                <div>

                    <p className="font-medium">
                        Modifier l&apos;adresse e-mail
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                        Le changement devra être confirmé
                        par e-mail avant de devenir effectif.
                    </p>

                </div>


                <div>

                    <label
                        htmlFor="nouvel-email"
                        className="
        mb-1
        block
        text-sm
        text-zinc-300
      "
                    >
                        Nouvelle adresse e-mail
                    </label>

                    <input
                        id="nouvel-email"
                        type="email"
                        autoComplete="email"
                        value={nouvelEmail}
                        onChange={(event) =>
                            setNouvelEmail(
                                event.target.value
                            )
                        }
                        className="
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


                {erreurEmail && (

                    <p className="text-sm text-red-400">
                        {erreurEmail}
                    </p>

                )}


                {messageEmail && (

                    <p className="text-sm text-[#8ED8B6]">
                        {messageEmail}
                    </p>

                )}


                <button
                    type="submit"
                    disabled={chargementEmail}
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
      disabled:opacity-50
    "
                >
                    {chargementEmail
                        ? "Envoi..."
                        : "Modifier l'adresse e-mail"}
                </button>

            </form>

            <div className="border-t border-zinc-800" />


            {/* MOT DE PASSE */}

            <form
                onSubmit={modifierMotDePasse}
                className="space-y-4"
            >

                <div>

                    <p className="font-medium">
                        Modifier le mot de passe
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                        Choisissez un nouveau mot de passe
                        pour votre compte runIN.
                    </p>

                </div>


                <div>

                    <label
                        htmlFor="nouveau-mot-de-passe"
                        className="
              mb-1
              block
              text-sm
              text-zinc-300
            "
                    >
                        Nouveau mot de passe
                    </label>

                    <input
                        id="nouveau-mot-de-passe"
                        type="password"
                        autoComplete="new-password"
                        value={nouveauMotDePasse}
                        onChange={(event) =>
                            setNouveauMotDePasse(
                                event.target.value
                            )
                        }
                        className="
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


                <div>

                    <label
                        htmlFor="confirmation-mot-de-passe"
                        className="
              mb-1
              block
              text-sm
              text-zinc-300
            "
                    >
                        Confirmer le mot de passe
                    </label>

                    <input
                        id="confirmation-mot-de-passe"
                        type="password"
                        autoComplete="new-password"
                        value={confirmation}
                        onChange={(event) =>
                            setConfirmation(
                                event.target.value
                            )
                        }
                        className="
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


                {message && (

                    <p className="text-sm text-[#8ED8B6]">
                        {message}
                    </p>

                )}


                <button
                    type="submit"
                    disabled={chargement}
                    className="
            rounded-lg
            bg-[#8ED8B6]
            px-4
            py-2
            text-sm
            font-medium
            text-black

            disabled:opacity-50
          "
                >
                    {chargement
                        ? "Modification..."
                        : "Modifier le mot de passe"}
                </button>

            </form>

        </div>
    );
}