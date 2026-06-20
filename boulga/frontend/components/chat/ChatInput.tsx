"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  IconArrowUp,
  IconPaperclip,
  IconPlayerStop,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { uploadFile } from "@/lib/api";
import type { Tier } from "@/types";

const SOURCE_PLUS_TIERS: Tier[] = ["source", "fleuve", "ocean"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingFile {
  localId: string;
  file: File;
  name: string;
  size: number;
}

const ACCEPT =
  ".csv,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ChatInput() {
  const sendMessage     = useChatStore((s) => s.sendMessage);
  const stopStreaming    = useChatStore((s) => s.stopStreaming);
  const isStreaming     = useChatStore((s) => s.isStreaming);
  const autoRoute       = useChatStore((s) => s.autoRoute);
  const toggleAutoRoute = useChatStore((s) => s.toggleAutoRoute);

  const user = useAuthStore((s) => s.user);
  // dev fallback — même logique que Navigation.tsx
  const userTier: Tier = (user as unknown as { tier?: Tier })?.tier ?? "source";
  const canAutoRoute = SOURCE_PLUS_TIERS.includes(userTier);

  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus auto après fin de streaming
  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  // Auto-resize du textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // max ~6 lignes (line-height 24px)
    el.style.height = `${Math.min(el.scrollHeight, 6 * 24 + 16)}px`;
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    resize();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (isStreaming) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setUploadError(null);
    setUploading(true);

    const fileIds: string[] = [];
    for (const pf of pendingFiles) {
      try {
        const result = await uploadFile(pf.file);
        fileIds.push(result.id);
      } catch (err) {
        setUploadError(
          `Erreur upload "${pf.name}" : ${err instanceof Error ? err.message : "inconnu"}`,
        );
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setText("");
    setPendingFiles([]);

    // Réinitialiser la hauteur du textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(trimmed, fileIds.length > 0 ? fileIds : undefined);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPending: PendingFile[] = files.map((f) => ({
      localId: `${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    // Réinitialiser l'input pour permettre de sélectionner le même fichier
    e.target.value = "";
  };

  const removeFile = (localId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.localId !== localId));
  };

  const canSend = text.trim().length > 0 && !uploading;

  return (
    <div className="flex-shrink-0 border-t border-neutral-border bg-neutral-white px-4 py-3">
      {/* Chips fichiers en attente */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((pf) => (
            <div
              key={pf.localId}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-neutral-border bg-neutral-bg text-[11px] font-body"
            >
              <span className="truncate max-w-[120px] text-marine">{pf.name}</span>
              <span className="text-neutral-text-tertiary">
                {formatBytes(pf.size)}
              </span>
              <button
                onClick={() => removeFile(pf.localId)}
                className="text-neutral-text-tertiary hover:text-error transition-colors duration-100 ml-0.5"
                aria-label={`Retirer ${pf.name}`}
              >
                <IconX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Erreur upload */}
      {uploadError && (
        <p className="text-caption font-body text-error mb-2">{uploadError}</p>
      )}

      {/* Zone de saisie */}
      <div className="flex items-end gap-2">
        {/* Bouton pièce jointe */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-md text-neutral-text-tertiary hover:text-marine hover:bg-neutral-bg transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed self-end"
          aria-label="Joindre un fichier"
        >
          <IconPaperclip size={20} />
        </button>

        {/* Bouton Routage Automatique (Source+) */}
        {canAutoRoute && (
          <button
            onClick={toggleAutoRoute}
            disabled={isStreaming}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-md transition-colors duration-100 self-end
              disabled:opacity-40 disabled:cursor-not-allowed
              ${autoRoute
                ? "bg-blue-700 text-neutral-white hover:bg-blue-900"
                : "text-neutral-text-tertiary hover:text-blue-700 hover:bg-neutral-bg"
              }`}
            title={autoRoute ? "Routage auto activé — cliquer pour désactiver" : "Activer le Routage Automatique Intelligent"}
            aria-label="Routage Automatique"
          >
            <IconWand size={20} />
          </button>
        )}

        {/* Input fichier caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Décrivez votre besoin, posez une question, uploadez un fichier..."
          rows={1}
          className="flex-1 resize-none rounded-md border border-neutral-border bg-neutral-bg px-3 py-2 text-body font-body text-marine placeholder:text-neutral-text-tertiary outline-none focus:border-blue-700 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
          style={{ minHeight: "40px", maxHeight: `${6 * 24 + 16}px` }}
        />

        {/* Bouton Envoyer / Stop */}
        {isStreaming ? (
          <button
            onClick={stopStreaming}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-error flex items-center justify-center hover:bg-red-800 transition-colors duration-200 self-end"
            aria-label="Arrêter la génération"
          >
            <IconPlayerStop size={18} className="text-white" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-blue-700 flex items-center justify-center hover:bg-blue-900 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed self-end"
            aria-label="Envoyer"
          >
            <IconArrowUp size={18} className="text-white" />
          </button>
        )}
      </div>

      {/* Hint clavier — masqué sur mobile */}
      <p className="hidden sm:block text-[10px] font-body text-neutral-text-tertiary mt-1.5 text-center">
        Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
      </p>
    </div>
  );
}
