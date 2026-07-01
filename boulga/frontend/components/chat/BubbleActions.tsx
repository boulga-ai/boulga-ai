"use client";

import { useState } from "react";
import { IconCopy, IconCheck, IconRefresh, IconSend, IconX, IconThumbUp, IconThumbDown } from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { postFeedback } from "@/lib/api";
import type { Message } from "@/types";

interface Props {
  message: Message;
}

export default function BubbleActions({ message }: Props) {
  const regenerateMessage = useChatStore((s) => s.regenerateMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [copied,  setCopied]  = useState(false);
  const [rating,  setRating]  = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard non disponible
    }
  };

  const handleRegenerate = () => {
    if (isStreaming) return;
    regenerateMessage(message.id);
  };

  async function handleThumbUp() {
    if (rating) return; // déjà noté
    setRating("up");
    try {
      await postFeedback({ message_id: message.id, rating: "up" });
    } catch {
      // silencieux — vote déjà enregistré localement
    }
  }

  function handleThumbDown() {
    if (rating) return;
    setRating("down");
    // Affiche le champ commentaire — l'envoi se fait via handleSendComment
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await postFeedback({
        message_id: message.id,
        rating: "down",
        comment: comment.trim() || undefined,
      });
      setComment("");
    } catch {
      // silencieux
    } finally {
      setSending(false);
    }
  }

  const btnBase =
    "p-1.5 rounded-md transition-colors duration-100";
  const btnInactive =
    "text-neutral-text-tertiary hover:text-neutral-text-secondary hover:bg-neutral-bg";

  return (
    <div className="mt-2">
      {/* Barre d'actions — visible au survol sur desktop, toujours visible sur mobile */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 md:transition-opacity md:duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100">
        {/* Copier */}
        <button
          onClick={handleCopy}
          className={`${btnBase} ${copied ? "text-success" : btnInactive}`}
          title="Copier la réponse"
          aria-label="Copier la réponse"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </button>

        {/* Régénérer */}
        <button
          onClick={handleRegenerate}
          disabled={isStreaming}
          className={`${btnBase} ${btnInactive} disabled:opacity-40 disabled:cursor-not-allowed`}
          title="Régénérer la réponse"
          aria-label="Régénérer la réponse"
        >
          <IconRefresh size={16} />
        </button>

        {/* Séparateur */}
        <span className="w-px h-3.5 bg-neutral-border mx-1" />

        {/* Thumbs up */}
        <button
          onClick={handleThumbUp}
          disabled={!!rating}
          className={`${btnBase} ${
            rating === "up" ? "text-blue-700 bg-blue-50" : btnInactive
          } disabled:cursor-default`}
          title="Bonne réponse"
          aria-label="Bonne réponse"
        >
          <IconThumbUp size={16} />
        </button>

        {/* Thumbs down */}
        <button
          onClick={handleThumbDown}
          disabled={!!rating}
          className={`${btnBase} ${
            rating === "down" ? "text-error bg-red-50" : btnInactive
          } disabled:cursor-default`}
          title="Mauvaise réponse"
          aria-label="Mauvaise réponse"
        >
          <IconThumbDown size={16} />
        </button>
      </div>

      {/* Zone commentaire (visible après 👎 tant que non envoyé) */}
      {rating === "down" && (
        <form
          onSubmit={handleSendComment}
          className="mt-2 ml-auto max-w-sm"
        >
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 280))}
              placeholder="Qu'est-ce qui n'allait pas ? (optionnel)"
              rows={2}
              className="w-full px-3 py-2 pr-10 text-caption font-body text-marine bg-neutral-bg border border-neutral-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-shadow duration-100 placeholder:text-neutral-text-tertiary"
            />
            <span className="absolute bottom-2 left-3 text-[10px] text-neutral-text-tertiary">
              {comment.length}/280
            </span>
            <div className="absolute bottom-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={() => { setRating(null); setComment(""); }}
                className="p-1 rounded text-neutral-text-tertiary hover:text-neutral-text transition-colors"
                title="Annuler"
              >
                <IconX size={13} />
              </button>
              <button
                type="submit"
                disabled={sending}
                className="p-1 rounded text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
                title="Envoyer"
              >
                {sending ? (
                  <IconCheck size={13} className="text-success" />
                ) : (
                  <IconSend size={13} />
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
