"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconChevronRight, IconSparkles, IconX } from "@tabler/icons-react";
import { useChatStore } from "@/store/chatStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import type { EffortLevel, LLM, Model, Tier } from "@/types";

const EFFORT_OPTIONS: { value: EffortLevel; label: string; hint: string }[] = [
  { value: "low",    label: "Faible",  hint: "Rapide et concis" },
  { value: "medium", label: "Moyen",   hint: "Équilibré — par défaut" },
  { value: "high",   label: "Élevé",   hint: "Analyse approfondie" },
  { value: "max",    label: "Max",     hint: "Raisonnement étendu" },
];

// ── Données statiques de support ──────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "#1565C0",
  claude: "#D97706",
  chatgpt: "#10B981",
  deepseek: "#7C3AED",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "gemini-2.5-flash": "Rapide, multimodal, tâches courantes",
  "gemini-2.5-pro": "Raisonnement avancé, contexte long",
  "claude-haiku-4-5": "Réponses concises et rapides",
  "claude-sonnet-4-6": "Analyse, code, rédaction avancée",
  "claude-opus-4-6": "Le plus puissant — agents, raisonnement complexe",
  "gpt-5.5-instant": "Créativité et génération rapide",
  "gpt-5.5-pro": "Rédaction professionnelle avancée",
  "deepseek-v4-flash": "Code et logique, ultra-efficace",
  "deepseek-v4-pro": "Développement complexe et debug",
};

const _STANDARD = ["gemini-2.5-flash", "gemini-2.5-pro", "claude-haiku-4-5", "claude-sonnet-4-6", "gpt-5.5-instant", "gpt-5.5-pro", "deepseek-v4-flash", "deepseek-v4-pro"];

const TIER_MODELS: Record<string, string[]> = {
  free:   ["gemini-2.5-flash"],
  goutte: ["gemini-2.5-flash", "deepseek-v4-flash"],
  source: _STANDARD,
  fleuve: _STANDARD,
  ocean:  [..._STANDARD, "claude-opus-4-6"],
};

// ── Hook ───────────────────────────────────────────────────────────────────────

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

// ── Types de sheet ─────────────────────────────────────────────────────────────
type SheetType = "provider" | "model" | null;

// ── Composant ─────────────────────────────────────────────────────────────────

export default function LLMSelector() {
  const llms = useChatStore((s) => s.llms);
  const selectedProvider = useChatStore((s) => s.selectedProvider);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const selectProvider = useChatStore((s) => s.selectProvider);
  const selectModel = useChatStore((s) => s.selectModel);
  const loadLLMs = useChatStore((s) => s.loadLLMs);
  const effort = useChatStore((s) => s.effort);
  const setEffort = useChatStore((s) => s.setEffort);

  const userTier = useSubscriptionStore((s) => s.tier) as Tier;
  const accessibleModels = TIER_MODELS[userTier] ?? TIER_MODELS.free;
  const setShowUpgradeModal = useSubscriptionStore((s) => s.setShowUpgradeModal);

  // Desktop dropdown state
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortSubmenuOpen, setEffortSubmenuOpen] = useState(false);

  // Mobile bottom sheet state
  const [sheet, setSheet] = useState<SheetType>(null);

  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useOutsideClick(providerRef, () => setProviderOpen(false));
  useOutsideClick(modelRef, () => { setModelOpen(false); setEffortSubmenuOpen(false); });

  useEffect(() => {
    loadLLMs();
  }, [loadLLMs]);

  const currentLLM = llms.find((l) => l.provider === selectedProvider);
  const currentModel = currentLLM?.models.find((m) => m.id === selectedModel);

  const providerColor = PROVIDER_COLORS[selectedProvider] ?? "#1565C0";
  const providerName = currentLLM?.label ?? selectedProvider;
  const modelLabel = currentModel?.label ?? selectedModel;

  const handleProviderSelect = (llm: LLM) => {
    if (!llm.active) return;
    // Si aucun modèle du provider n'est accessible → modale upgrade
    const hasAccessibleModel = llm.models.some((m) => accessibleModels.includes(m.id));
    if (!hasAccessibleModel) {
      setShowUpgradeModal(true);
      setProviderOpen(false);
      setSheet(null);
      return;
    }
    selectProvider(llm.provider);
    const lowModel = llm.models.find((m) => m.tier === "low" && accessibleModels.includes(m.id))
      ?? llm.models.find((m) => m.tier === "low");
    if (lowModel) selectModel(lowModel.id);
    setProviderOpen(false);
    setSheet(null);
  };

  const handleModelSelect = (model: Model) => {
    if (!accessibleModels.includes(model.id)) {
      setShowUpgradeModal(true);
      setModelOpen(false);
      setSheet(null);
      return;
    }
    selectModel(model.id);
    setModelOpen(false);
    setSheet(null);
  };

  if (llms.length === 0) {
    return (
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-neutral-border bg-neutral-white">
        <div className="h-7 w-28 rounded-md bg-neutral-bg animate-pulse" />
        <div className="h-7 w-36 rounded-md bg-neutral-bg animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-neutral-border bg-neutral-white">

        {/* ── Bouton Fournisseur ──────────────────────────────────────────── */}
        {/* Desktop: toggle dropdown — Mobile: open bottom sheet */}
        <div ref={providerRef} className="relative">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setSheet("provider");
              } else {
                setProviderOpen((o) => !o);
                setModelOpen(false);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-border bg-neutral-white hover:bg-neutral-bg transition-colors duration-100"
            aria-label="Choisir le fournisseur"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: providerColor }}
            />
            <span className="text-uism font-body text-marine font-medium">
              {providerName}
            </span>
            <IconChevronDown
              size={14}
              className={`text-neutral-text-tertiary transition-transform duration-200 ${providerOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Desktop dropdown */}
          {providerOpen && (
            <div className="hidden md:block absolute top-full left-0 mt-1 w-52 bg-neutral-white border border-neutral-border rounded-md shadow-lg z-20 overflow-hidden">
              {llms.map((llm) => (
                <button
                  key={llm.provider}
                  onClick={() => handleProviderSelect(llm)}
                  disabled={!llm.active}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors duration-100 ${
                    llm.active
                      ? llm.provider === selectedProvider
                        ? "bg-blue-50 text-blue-700"
                        : "text-marine hover:bg-neutral-bg"
                      : "text-neutral-text-tertiary cursor-not-allowed"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: llm.active
                          ? PROVIDER_COLORS[llm.provider] ?? "#94A3B8"
                          : "#CBD5E1",
                      }}
                    />
                    <span className="text-uism font-body">{llm.label}</span>
                  </span>
                  {!llm.active && (
                    <span className="text-[10px] font-body font-medium px-1.5 py-0.5 rounded-sm bg-neutral-bg text-neutral-text-tertiary">
                      Bientôt
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Bouton Modèle ────────────────────────────────────────────────── */}
        {currentLLM && (
          <div ref={modelRef} className="relative">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setSheet("model");
                } else {
                  setModelOpen((o) => !o);
                  setProviderOpen(false);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-border bg-neutral-white hover:bg-neutral-bg transition-colors duration-100"
              aria-label="Choisir le modèle"
            >
              <IconSparkles size={13} className="text-neutral-text-tertiary" />
              <span className="text-uism font-body text-marine">
                {modelLabel}
              </span>
              <span
                className={`text-[10px] font-body font-medium px-1.5 py-0.5 rounded-sm ${
                  currentModel?.tier === "high"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-neutral-bg text-neutral-text-secondary"
                }`}
              >
                {currentModel?.tier === "high" ? "Pro" : "Éco"}
              </span>
              <IconChevronDown
                size={14}
                className={`text-neutral-text-tertiary transition-transform duration-200 ${modelOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Desktop dropdown */}
            {modelOpen && (
              <div className="hidden md:block absolute top-full left-0 mt-1 w-72 bg-neutral-white border border-neutral-border rounded-xl shadow-lg z-20 overflow-hidden">
                {/* Liste des modèles */}
                {currentLLM.models.map((model) => {
                  const accessible = accessibleModels.includes(model.id);
                  const isSelected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      disabled={!accessible}
                      className={`w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-100 border-b border-neutral-border last:border-0 ${
                        accessible
                          ? isSelected
                            ? "bg-blue-50"
                            : "hover:bg-neutral-bg"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-uism font-body font-medium ${isSelected ? "text-blue-700" : "text-marine"}`}>
                          {model.label}
                        </p>
                        <p className="text-caption font-body text-neutral-text-secondary mt-0.5 truncate">
                          {MODEL_DESCRIPTIONS[model.id] ?? ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-[10px] font-body font-medium px-1.5 py-0.5 rounded-sm ${
                            model.tier === "high"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-neutral-bg text-neutral-text-secondary"
                          }`}
                        >
                          {model.tier === "high" ? "Pro" : "Éco"}
                        </span>
                        {!accessible && (
                          <span className="text-[10px] font-body text-warning">
                            Plan requis
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Séparateur + sous-menu Effort */}
                <div className="border-t border-neutral-border">
                  <button
                    onClick={() => setEffortSubmenuOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-neutral-bg transition-colors duration-100"
                  >
                    <span className="text-uism font-body text-neutral-text-secondary">Effort</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-body font-medium text-marine">
                        {EFFORT_OPTIONS.find((o) => o.value === effort)?.label}
                      </span>
                      <IconChevronRight
                        size={13}
                        className={`text-neutral-text-tertiary transition-transform duration-150 ${effortSubmenuOpen ? "rotate-90" : ""}`}
                      />
                    </div>
                  </button>

                  {effortSubmenuOpen && (
                    <div className="border-t border-neutral-border/50 bg-neutral-bg/50">
                      {EFFORT_OPTIONS.map(({ value, label, hint }) => {
                        const isSelected = effort === value;
                        const isDisabled = value === "max" && userTier === "free";
                        return (
                          <button
                            key={value}
                            onClick={() => {
                              if (!isDisabled) {
                                setEffort(value);
                                setEffortSubmenuOpen(false);
                                setModelOpen(false);
                              }
                            }}
                            disabled={isDisabled}
                            className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors duration-100
                              ${isDisabled ? "opacity-40 cursor-not-allowed" : isSelected ? "bg-blue-50" : "hover:bg-neutral-bg"}`}
                          >
                            <div>
                              <span className={`text-[12px] font-body font-medium ${isSelected ? "text-blue-700" : "text-marine"}`}>
                                {label}
                              </span>
                              <p className="text-[10px] font-body text-neutral-text-tertiary">{hint}</p>
                            </div>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-700 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Sheet ───────────────────────────────────────────────── */}
      {sheet && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSheet(null)}
          />
          {/* Panel */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-white rounded-t-2xl shadow-xl pb-[env(safe-area-inset-bottom)] max-h-[75vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-border flex-shrink-0">
              <span className="text-ui font-body font-medium text-marine">
                {sheet === "provider" ? "Choisir le fournisseur" : "Choisir le modèle"}
              </span>
              <button
                onClick={() => setSheet(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-bg text-neutral-text-tertiary"
                aria-label="Fermer"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Options */}
            <div className="overflow-y-auto">
              {sheet === "provider" &&
                llms.map((llm) => (
                  <button
                    key={llm.provider}
                    onClick={() => handleProviderSelect(llm)}
                    disabled={!llm.active}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-neutral-border last:border-0 transition-colors duration-100 ${
                      llm.active
                        ? llm.provider === selectedProvider
                          ? "bg-blue-50 text-blue-700"
                          : "text-marine"
                        : "text-neutral-text-tertiary cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          background: llm.active
                            ? PROVIDER_COLORS[llm.provider] ?? "#94A3B8"
                            : "#CBD5E1",
                        }}
                      />
                      <span className="text-ui font-body font-medium">{llm.label}</span>
                    </span>
                    {!llm.active && (
                      <span className="text-[10px] font-body font-medium px-2 py-0.5 rounded-sm bg-neutral-bg text-neutral-text-tertiary">
                        Bientôt
                      </span>
                    )}
                  </button>
                ))}

              {sheet === "model" &&
                currentLLM?.models.map((model) => {
                  const accessible = accessibleModels.includes(model.id);
                  const isSelected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      disabled={!accessible}
                      className={`w-full flex items-start justify-between gap-3 px-4 py-4 border-b border-neutral-border last:border-0 transition-colors duration-100 ${
                        accessible
                          ? isSelected
                            ? "bg-blue-50"
                            : ""
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-ui font-body font-medium ${isSelected ? "text-blue-700" : "text-marine"}`}>
                          {model.label}
                        </p>
                        <p className="text-caption font-body text-neutral-text-secondary mt-0.5">
                          {MODEL_DESCRIPTIONS[model.id] ?? ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-[10px] font-body font-medium px-1.5 py-0.5 rounded-sm ${
                            model.tier === "high"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-neutral-bg text-neutral-text-secondary"
                          }`}
                        >
                          {model.tier === "high" ? "Pro" : "Éco"}
                        </span>
                        {!accessible && (
                          <span className="text-[10px] font-body text-warning">
                            Plan requis
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
