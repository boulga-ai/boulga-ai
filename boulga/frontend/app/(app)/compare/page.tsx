"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  IconLayoutColumns,
  IconCopy,
  IconCheck,
  IconPlayerStop,
  IconArrowUp,
  IconLock,
  IconClock,
  IconMathSymbols,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { useCompareStore } from "@/store/compareStore";
import { useAuthStore } from "@/store/authStore";
import type { LLM } from "@/types";

// ── Constantes ────────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "#1565C0",
  claude: "#D97706",
  chatgpt: "#10B981",
  deepseek: "#7C3AED",
};

// Tiers qui ont accès au Mode Comparaison
const SOURCE_PLUS = ["source", "fleuve", "ocean"];

// ── Tier gate ─────────────────────────────────────────────────────────────────

function UpgradeGate() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
        <IconLock size={32} className="text-blue-700" />
      </div>
      <div>
        <p className="text-[18px] font-body font-medium text-marine mb-2">
          Mode Comparaison — Plan Source requis
        </p>
        <p className="text-[14px] text-neutral-text-secondary max-w-sm">
          Comparez les réponses de plusieurs LLM côte à côte en temps réel.
          Disponible à partir du plan Source.
        </p>
      </div>
      <a
        href="/pricing"
        className="px-6 py-2.5 rounded-md bg-blue-700 text-white text-uism font-body font-medium hover:bg-blue-900 transition-colors duration-200"
      >
        Voir les plans
      </a>
    </div>
  );
}

// ── Provider selector ─────────────────────────────────────────────────────────

function ProviderSelector({
  llms,
  selectedKeys,
  onToggle,
}: {
  llms: LLM[];
  selectedKeys: Set<string>;
  onToggle: (key: string, provider: string, modelId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {llms.map((llm) => {
        const model = llm.models.find((m) => m.tier === "low") ?? llm.models[0];
        if (!model) return null;
        const key = `${llm.provider}:${model.id}`;
        const checked = selectedKeys.has(key);
        const color = PROVIDER_COLORS[llm.provider] ?? "#94A3B8";

        return (
          <button
            key={key}
            onClick={() => llm.active && onToggle(key, llm.provider, model.id)}
            disabled={!llm.active}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border text-uism font-body transition-all duration-100 ${
              !llm.active
                ? "border-neutral-border text-neutral-text-tertiary cursor-not-allowed opacity-50"
                : checked
                ? "border-blue-700 bg-blue-50 text-blue-700"
                : "border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg"
            }`}
            title={!llm.active ? "Bientôt disponible" : undefined}
          >
            {/* Checkbox visuelle */}
            <span
              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                checked ? "border-blue-700 bg-blue-700" : "border-neutral-border"
              }`}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {/* Pastille couleur */}
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span>{llm.label}</span>
            {!llm.active && (
              <span className="text-[10px] px-1 py-0.5 rounded-sm bg-neutral-bg text-neutral-text-tertiary">
                Bientôt
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Result column ─────────────────────────────────────────────────────────────

function ResultColumn({
  providerKey,
  providerName,
  modelLabel,
  result,
}: {
  providerKey: string;
  providerName: string;
  modelLabel: string;
  result: {
    content: string;
    done: boolean;
    error: string | null;
    latencyMs: number | null;
    tokens: number | null;
  } | null;
}) {
  const [copied, setCopied] = useState(false);
  const color = PROVIDER_COLORS[providerKey.split(":")[0]] ?? "#94A3B8";

  const handleCopy = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const isThinking = result && !result.content && !result.done && !result.error;

  return (
    <div
      className={`flex flex-col min-h-0 border border-neutral-border rounded-lg overflow-hidden ${
        result?.error ? "opacity-60" : ""
      }`}
    >
      {/* En-tête colonne */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-border bg-neutral-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <div>
            <p className="text-[13px] font-body font-medium text-marine leading-none">
              {providerName}
            </p>
            <p className="text-[10px] font-body text-neutral-text-tertiary mt-0.5">
              {modelLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badges latence + tokens */}
          {result?.done && !result.error && (
            <>
              {result.latencyMs !== null && (
                <span className="flex items-center gap-1 text-[10px] font-body text-neutral-text-tertiary">
                  <IconClock size={10} />
                  {result.latencyMs > 999
                    ? `${(result.latencyMs / 1000).toFixed(1)}s`
                    : `${result.latencyMs}ms`}
                </span>
              )}
              {result.tokens !== null && (
                <span className="flex items-center gap-1 text-[10px] font-body text-neutral-text-tertiary">
                  <IconMathSymbols size={10} />
                  {result.tokens}
                </span>
              )}
            </>
          )}

          {/* Bouton copier (visible si contenu) */}
          {result?.content && (
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition-colors duration-100 ${
                copied ? "text-success" : "text-neutral-text-tertiary hover:text-marine"
              }`}
              title="Copier"
            >
              {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto p-4 bg-neutral-bg text-[14px]">
        {result?.error ? (
          <div className="flex items-start gap-2 text-error">
            <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-[13px] font-body">{result.error}</p>
          </div>
        ) : isThinking ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        ) : result?.content ? (
          <div className={`prose-chat${!result.done ? " streaming-cursor" : ""}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {result.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-neutral-text-tertiary text-[13px]">En attente…</p>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ComparePage() {
  const llms = useChatStore((s) => s.llms);
  const loadLLMs = useChatStore((s) => s.loadLLMs);

  const results = useCompareStore((s) => s.results);
  const isComparing = useCompareStore((s) => s.isComparing);
  const activeProviders = useCompareStore((s) => s.activeProviders);
  const fatalError = useCompareStore((s) => s.fatalError);
  const sessions = useCompareStore((s) => s.sessions);
  const setActiveProviders = useCompareStore((s) => s.setActiveProviders);
  const startComparison = useCompareStore((s) => s.startComparison);
  const stopComparison = useCompareStore((s) => s.stopComparison);
  const loadHistory = useCompareStore((s) => s.loadHistory);
  const clearResults = useCompareStore((s) => s.clearResults);

  // TODO (prompt 12) : brancher le vrai tier du user
  const user = useAuthStore((s) => s.user);
  const userTier: string = (user as unknown as { tier?: string })?.tier ?? "source"; // défaut source pour dev
  const hasAccess = SOURCE_PLUS.includes(userTier);

  const [prompt, setPrompt] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadLLMs();
    loadHistory();
  }, [loadLLMs, loadHistory]);

  // Sélectionner Gemini par défaut à l'init
  useEffect(() => {
    if (llms.length > 0 && selectedKeys.size === 0) {
      const gemini = llms.find((l) => l.provider === "gemini" && l.active);
      if (gemini) {
        const model = gemini.models.find((m) => m.tier === "low") ?? gemini.models[0];
        if (model) {
          setSelectedKeys(new Set([`gemini:${model.id}`]));
        }
      }
    }
  }, [llms, selectedKeys.size]);

  const handleToggle = useCallback(
    (key: string, provider: string, modelId: string) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else if (next.size < 4) {
          next.add(key);
        }
        return next;
      });
      // Mettre à jour le store
      const keys = Array.from(selectedKeys);
      const wasSelected = keys.includes(key);
      let newKeys = wasSelected ? keys.filter((k) => k !== key) : [...keys, key];
      if (!wasSelected && newKeys.length > 4) return;
      setActiveProviders(
        newKeys.map((k) => {
          const [p, m] = k.split(":");
          return { provider: p, model_id: m };
        }),
      );
    },
    [selectedKeys, setActiveProviders],
  );

  const handleSend = () => {
    if (!prompt.trim() || isComparing || selectedKeys.size < 2) return;
    clearResults();
    // Mettre à jour activeProviders depuis selectedKeys avant de lancer
    const providers = Array.from(selectedKeys).map((k) => {
      const [p, m] = k.split(":");
      return { provider: p, model_id: m };
    });
    setActiveProviders(providers);
    // Léger délai pour que le store soit mis à jour
    setTimeout(() => startComparison(prompt.trim()), 0);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyAll = async () => {
    const parts = Object.entries(results)
      .filter(([, r]) => r.content)
      .map(([key, r]) => {
        const llm = llms.find((l) => l.provider === r.provider);
        const name = llm?.label ?? r.provider;
        return `## ${name}\n\n${r.content}`;
      });
    if (!parts.length) return;
    try {
      await navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      //
    }
  };

  const resultEntries = Object.entries(results);
  const hasResults = resultEntries.length > 0;

  // Onglet mobile actif par défaut
  useEffect(() => {
    if (resultEntries.length > 0 && !activeTab) {
      setActiveTab(resultEntries[0][0]);
    }
  }, [resultEntries.length, activeTab]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <UpgradeGate />
      </div>
    );
  }

  const gridCols =
    resultEntries.length === 2
      ? "grid-cols-2"
      : resultEntries.length === 3
        ? "grid-cols-3"
        : "grid-cols-2 xl:grid-cols-4";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* En-tête */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-neutral-border bg-neutral-white">
        <div className="flex items-center gap-3 mb-1">
          <IconLayoutColumns size={20} className="text-blue-700" />
          <h1 className="text-[18px] font-body font-semibold text-marine">
            Mode Comparaison
          </h1>
        </div>
        <p className="text-[13px] font-body text-neutral-text-secondary mb-4">
          Envoyez un prompt et comparez les réponses de 2 à 4 LLM en temps réel.
        </p>

        {/* Sélecteur de providers */}
        <ProviderSelector
          llms={llms}
          selectedKeys={selectedKeys}
          onToggle={handleToggle}
        />

        {selectedKeys.size < 2 && (
          <p className="text-[11px] font-body text-warning mt-2">
            Sélectionnez au moins 2 LLM pour lancer une comparaison.
          </p>
        )}

        {/* Zone de saisie */}
        <div className="flex items-end gap-2 mt-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={isComparing}
            placeholder="Posez votre question à tous les LLM sélectionnés…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-neutral-border bg-neutral-bg px-3 py-2 text-[14px] font-body text-marine placeholder:text-neutral-text-tertiary outline-none focus:border-blue-700 transition-colors duration-100 disabled:opacity-50"
            style={{ minHeight: "56px", maxHeight: "120px" }}
          />
          {isComparing ? (
            <button
              onClick={stopComparison}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-error flex items-center justify-center hover:bg-red-800 transition-colors duration-200 self-end"
              aria-label="Arrêter"
            >
              <IconPlayerStop size={16} className="text-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || selectedKeys.size < 2}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center hover:bg-blue-900 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed self-end"
              aria-label="Envoyer"
            >
              <IconArrowUp size={16} className="text-white" />
            </button>
          )}
        </div>

        {/* Erreur fatale */}
        {fatalError && (
          <p className="text-[12px] font-body text-error mt-2">{fatalError}</p>
        )}
      </div>

      {/* Zone de résultats */}
      {hasResults ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Actions globales */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-neutral-border flex-shrink-0 bg-neutral-white">
            {/* Onglets mobile */}
            <div className="flex md:hidden gap-1">
              {resultEntries.map(([key, r]) => {
                const llm = llms.find((l) => l.provider === r.provider);
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-body transition-colors duration-100 ${
                      activeTab === key
                        ? "bg-blue-700 text-white"
                        : "text-neutral-text-secondary hover:bg-neutral-bg"
                    }`}
                  >
                    {llm?.label ?? r.provider}
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block" />

            <button
              onClick={handleCopyAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-uism font-body border transition-colors duration-100 ${
                copiedAll
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-neutral-border text-neutral-text-secondary hover:bg-neutral-bg"
              }`}
            >
              {copiedAll ? (
                <><IconCheck size={13} /> Copié</>
              ) : (
                <><IconCopy size={13} /> Copier tout</>
              )}
            </button>
          </div>

          {/* Grille desktop */}
          <div className={`hidden md:grid flex-1 overflow-hidden gap-4 p-4 ${gridCols}`}>
            {resultEntries.map(([key, result]) => {
              const llm = llms.find((l) => l.provider === result.provider);
              const modelLabel =
                llm?.models.find((m) => m.id === result.model)?.label ?? result.model;
              return (
                <ResultColumn
                  key={key}
                  providerKey={key}
                  providerName={llm?.label ?? result.provider}
                  modelLabel={modelLabel}
                  result={result}
                />
              );
            })}
          </div>

          {/* Vue onglets mobile */}
          <div className="md:hidden flex-1 overflow-hidden p-4">
            {resultEntries
              .filter(([key]) => key === activeTab)
              .map(([key, result]) => {
                const llm = llms.find((l) => l.provider === result.provider);
                const modelLabel =
                  llm?.models.find((m) => m.id === result.model)?.label ?? result.model;
                return (
                  <ResultColumn
                    key={key}
                    providerKey={key}
                    providerName={llm?.label ?? result.provider}
                    modelLabel={modelLabel}
                    result={result}
                  />
                );
              })}
          </div>
        </div>
      ) : (
        /* État vide */
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <IconLayoutColumns size={32} className="text-neutral-text-tertiary" />
          <p className="text-[14px] font-body text-neutral-text-secondary max-w-sm">
            Sélectionnez 2 à 4 LLM, rédigez votre prompt et comparez les réponses côte à côte.
          </p>

          {/* Historique rapide */}
          {sessions.length > 0 && (
            <div className="mt-6 w-full max-w-md">
              <p className="text-[11px] font-body font-medium text-neutral-text-tertiary uppercase tracking-wide mb-2 text-left">
                Sessions récentes
              </p>
              <div className="space-y-1">
                {sessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border border-neutral-border bg-neutral-white text-left"
                  >
                    <span className="flex-1 text-[12px] font-body text-marine truncate">
                      {s.prompt}
                    </span>
                    <span className="text-[10px] font-body text-neutral-text-tertiary flex-shrink-0">
                      {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
