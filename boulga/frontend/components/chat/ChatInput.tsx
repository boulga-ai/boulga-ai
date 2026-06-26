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
  IconChevronDown,
  IconPaperclip,
  IconPlayerStop,
  IconPlus,
  IconWand,
  IconWorldSearch,
  IconX,
} from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { uploadFile } from "@/lib/api";
import type { Tier, EffortLevel } from "@/types";

const SOURCE_PLUS_TIERS: Tier[] = ["source", "fleuve", "ocean"];

const EFFORT_OPTIONS: { value: EffortLevel; label: string; hint: string }[] = [
  { value: "low",    label: "Faible",  hint: "Rapide et concis" },
  { value: "medium", label: "Moyen",   hint: "Équilibré — par défaut" },
  { value: "high",   label: "Élevé",   hint: "Analyse approfondie" },
  { value: "max",    label: "Max",     hint: "Raisonnement étendu" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingFile {
  localId: string;
  file: File;
  name: string;
  size: number;
}

const ACCEPT = ".csv,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ChatInput() {
  const sendMessage      = useChatStore((s) => s.sendMessage);
  const stopStreaming     = useChatStore((s) => s.stopStreaming);
  const isStreaming      = useChatStore((s) => s.isStreaming);
  const autoRoute        = useChatStore((s) => s.autoRoute);
  const toggleAutoRoute  = useChatStore((s) => s.toggleAutoRoute);
  const effort           = useChatStore((s) => s.effort);
  const setEffort        = useChatStore((s) => s.setEffort);
  const enableSearch     = useChatStore((s) => s.enableSearch);
  const toggleSearch     = useChatStore((s) => s.toggleSearch);
  const selectedProvider = useChatStore((s) => s.selectedProvider);

  const user = useAuthStore((s) => s.user);
  const userTier: Tier = (user as unknown as { tier?: Tier })?.tier ?? "source";
  const canAutoRoute = SOURCE_PLUS_TIERS.includes(userTier);
  const canSearch    = selectedProvider === "gemini" || selectedProvider === "claude";

  const [text, setText]               = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [effortOpen, setEffortOpen]   = useState(false);
  const [toolsOpen, setToolsOpen]     = useState(false);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const effortRef    = useRef<HTMLDivElement>(null);
  const toolsRef     = useRef<HTMLDivElement>(null);

  // Focus auto après fin de streaming
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  // Fermer les popover au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (effortRef.current && !effortRef.current.contains(e.target as Node)) {
        setEffortOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-resize du textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";

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
    e.target.value = "";
  };

  const removeFile = (localId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.localId !== localId));
  };

  const canSend = text.trim().length > 0 && !uploading;
  const currentEffortLabel = EFFORT_OPTIONS.find((o) => o.value === effort)?.label ?? "Moyen";

  // Indicateurs d'outils actifs (visibles à côté du +)
  const activeTools: { icon: React.ReactNode; label: string; onRemove: () => void }[] = [];
  if (enableSearch && canSearch) {
    activeTools.push({
      icon: <IconWorldSearch size={11} />,
      label: "Recherche",
      onRemove: toggleSearch,
    });
  }
  if (autoRoute && canAutoRoute) {
    activeTools.push({
      icon: <IconWand size={11} />,
      label: "Routage",
      onRemove: toggleAutoRoute,
    });
  }

  return (
    <div className="flex-shrink-0 bg-neutral-white px-4 py-3">
      <div className="max-w-3xl mx-auto">

        {/* Chips fichiers en attente */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((pf) => (
              <div
                key={pf.localId}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-neutral-border bg-neutral-bg text-[11px] font-body"
              >
                <span className="truncate max-w-[120px] text-marine">{pf.name}</span>
                <span className="text-neutral-text-tertiary">{formatBytes(pf.size)}</span>
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

        {/* ── Carte input ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-neutral-border bg-neutral-white shadow-sm focus-within:border-blue-700 transition-colors duration-150">

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Écrivez un message..."
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-body font-body text-marine placeholder:text-neutral-text-tertiary outline-none disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
            style={{ minHeight: "48px", maxHeight: `${6 * 24 + 16}px` }}
          />

          {/* Barre d'outils */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">

            {/* ── Gauche : + menu + indicateurs actifs ── */}
            <div className="flex items-center gap-1.5">

              {/* Bouton + */}
              <div ref={toolsRef} className="relative">
                <button
                  onClick={() => setToolsOpen((o) => !o)}
                  disabled={isStreaming}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed
                    ${toolsOpen
                      ? "border-blue-700 text-blue-700 bg-blue-50"
                      : "border-neutral-border text-neutral-text-secondary hover:border-neutral-text-secondary hover:text-marine bg-neutral-white"
                    }`}
                  aria-label="Outils"
                >
                  <IconPlus size={16} className={`transition-transform duration-150 ${toolsOpen ? "rotate-45" : ""}`} />
                </button>

                {/* Popover outils — s'ouvre vers le haut */}
                {toolsOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-neutral-white border border-neutral-border rounded-xl shadow-lg z-30 overflow-hidden py-1">

                    {/* Joindre un fichier */}
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-bg transition-colors duration-100"
                    >
                      <IconPaperclip size={16} className="text-neutral-text-secondary flex-shrink-0" />
                      <span className="text-[13px] font-body text-marine">Joindre un fichier</span>
                    </button>

                    {/* Recherche web — conditionnel */}
                    {canSearch && (
                      <>
                        <div className="h-px bg-neutral-border/60 mx-3" />
                        <button
                          onClick={() => {
                            toggleSearch();
                            setToolsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                            enableSearch ? "bg-blue-50" : "hover:bg-neutral-bg"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <IconWorldSearch size={16} className={enableSearch ? "text-blue-700" : "text-neutral-text-secondary"} />
                            <span className={`text-[13px] font-body ${enableSearch ? "text-blue-700 font-medium" : "text-marine"}`}>
                              Recherche web
                            </span>
                          </span>
                          {enableSearch && (
                            <span className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                        </button>
                      </>
                    )}

                    {/* Routage auto — conditionnel */}
                    {canAutoRoute && (
                      <>
                        <div className="h-px bg-neutral-border/60 mx-3" />
                        <button
                          onClick={() => {
                            toggleAutoRoute();
                            setToolsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                            autoRoute ? "bg-blue-50" : "hover:bg-neutral-bg"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <IconWand size={16} className={autoRoute ? "text-blue-700" : "text-neutral-text-secondary"} />
                            <div>
                              <span className={`text-[13px] font-body ${autoRoute ? "text-blue-700 font-medium" : "text-marine"}`}>
                                Routage automatique
                              </span>
                              <p className="text-[10px] font-body text-neutral-text-tertiary">Choisit le meilleur modèle</p>
                            </div>
                          </span>
                          {autoRoute && (
                            <span className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Indicateurs des outils actifs */}
              {activeTools.map((tool) => (
                <button
                  key={tool.label}
                  onClick={tool.onRemove}
                  disabled={isStreaming}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-body font-medium hover:bg-blue-100 transition-colors duration-100 disabled:opacity-40"
                  title={`Désactiver ${tool.label}`}
                >
                  {tool.icon}
                  <span>{tool.label}</span>
                  <IconX size={9} className="ml-0.5 opacity-60" />
                </button>
              ))}
            </div>

            {/* ── Droite : effort + envoi ── */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Effort compact */}
              <div ref={effortRef} className="relative">
                <button
                  onClick={() => setEffortOpen((o) => !o)}
                  disabled={isStreaming}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-body font-medium text-neutral-text-secondary hover:text-marine hover:bg-neutral-bg transition-colors duration-100 disabled:opacity-40"
                  aria-label="Niveau d'effort"
                >
                  {currentEffortLabel}
                  <IconChevronDown
                    size={11}
                    className={`transition-transform duration-150 ${effortOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Popover effort */}
                {effortOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-neutral-white border border-neutral-border rounded-xl shadow-lg z-30 overflow-hidden py-1">
                    {EFFORT_OPTIONS.map(({ value, label, hint }) => {
                      const isSelected = effort === value;
                      const isDisabled = value === "max" && userTier === "free";
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            if (!isDisabled) {
                              setEffort(value);
                              setEffortOpen(false);
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-100
                            ${isDisabled
                              ? "opacity-40 cursor-not-allowed"
                              : isSelected
                                ? "bg-blue-50"
                                : "hover:bg-neutral-bg"
                            }`}
                        >
                          <span className={`mt-1 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                            isSelected ? "border-blue-700 bg-blue-700" : "border-neutral-border"
                          }`} />
                          <div>
                            <p className={`text-[13px] font-body font-medium ${isSelected ? "text-blue-700" : "text-marine"}`}>
                              {label}
                              {value === "max" && userTier === "free" && (
                                <span className="ml-1.5 text-[10px] font-normal text-warning">Plan Goutte+</span>
                              )}
                            </p>
                            <p className="text-[11px] font-body text-neutral-text-tertiary mt-0.5">{hint}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Envoyer / Stop */}
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="w-8 h-8 rounded-full bg-error flex items-center justify-center hover:bg-red-800 transition-colors duration-200"
                  aria-label="Arrêter la génération"
                >
                  <IconPlayerStop size={14} className="text-white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center hover:bg-blue-900 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Envoyer"
                >
                  <IconArrowUp size={14} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input fichier caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Hint clavier */}
        <p className="hidden sm:block text-[10px] font-body text-neutral-text-tertiary mt-1.5 text-center">
          Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
        </p>
      </div>
    </div>
  );
}
