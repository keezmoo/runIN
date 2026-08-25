"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type MessageFormProps = {
  conversationId: string;
};

export default function MessageForm({ conversationId }: MessageFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [contenu, setContenu] = useState("");

  const [loading, setLoading] = useState(false);

  const [messageErreur, setMessageErreur] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function ajusterHauteur() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  function gererClavier(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (loading || contenu.trim() === "") {
        return;
      }

      event.currentTarget.form?.requestSubmit();
    }
  }

  async function envoyerMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const contenuNettoye = contenu.trim();

    if (!contenuNettoye) {
      return;
    }

    if (contenuNettoye.length > 2000) {
      setMessageErreur("Le message ne peut pas dépasser 2000 caractères.");

      return;
    }

    setLoading(true);
    setMessageErreur("");

    const { data, error } = await supabase.rpc("envoyer_message_sortie", {
      p_conversation_id: conversationId,

      p_contenu: contenuNettoye,
    });

    if (data === "SPAM_MESSAGES") {
      setMessageErreur(
        "Vous envoyez des messages trop rapidement. Réessayez dans une minute.",
      );

      setLoading(false);

      return;
    }

    if (error) {
      console.error("Erreur envoi message :", error);

      setMessageErreur("Impossible d'envoyer le message.");

      setLoading(false);

      return;
    }

    setContenu("");
    setLoading(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    router.refresh();
  }

  return (
    <form onSubmit={envoyerMessage} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={contenu}
        onChange={(event) => {
          setContenu(event.target.value);

          ajusterHauteur();
        }}
        onKeyDown={gererClavier}
        maxLength={2000}
        rows={2}
        placeholder="Écrire un message..."
        disabled={loading}
        className="
    max-h-40
    w-full
    resize-none
    overflow-y-auto
    rounded
    border
    p-3
  "
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">{contenu.length} / 2000</p>

        <button
          type="submit"
          disabled={loading || contenu.trim() === ""}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </div>

      {messageErreur && <p className="text-sm text-red-500">{messageErreur}</p>}
    </form>
  );
}
