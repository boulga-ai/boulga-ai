import { create } from "zustand";
import { streamCompare } from "@/lib/stream";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import type { ComparisonSession } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompareResult {
  content: string;
  done: boolean;
  error: string | null;
  latencyMs: number | null;
  tokens: number | null;
  provider: string;
  model: string;
}

export interface ProviderModel {
  provider: string;
  model_id: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface CompareState {
  sessions: ComparisonSession[];
  currentSessionId: string | null;
  /** Clé : "${provider}:${model_id}" */
  results: Record<string, CompareResult>;
  isComparing: boolean;
  activeProviders: ProviderModel[];
  fatalError: string | null;
  _abortController: AbortController | null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface CompareActions {
  setActiveProviders: (providers: ProviderModel[]) => void;
  startComparison: (prompt: string) => void;
  stopComparison: () => void;
  loadHistory: () => Promise<void>;
  clearResults: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCompareStore = create<CompareState & CompareActions>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  results: {},
  isComparing: false,
  activeProviders: [],
  fatalError: null,
  _abortController: null,

  setActiveProviders: (providers) => set({ activeProviders: providers }),

  startComparison: (prompt: string) => {
    const { isComparing, activeProviders } = get();
    if (isComparing) return;
    if (activeProviders.length < 2) return;

    // Initialiser les slots de résultats
    const results: Record<string, CompareResult> = {};
    for (const pm of activeProviders) {
      const key = `${pm.provider}:${pm.model_id}`;
      results[key] = {
        content: "",
        done: false,
        error: null,
        latencyMs: null,
        tokens: null,
        provider: pm.provider,
        model: pm.model_id,
      };
    }

    set({ results, isComparing: true, fatalError: null, currentSessionId: null });

    const controller = streamCompare(
      { prompt, providers: activeProviders },
      {
        onChunk: (provider, model, text) => {
          const key = `${provider}:${model}`;
          set((s) => ({
            results: {
              ...s.results,
              [key]: {
                ...s.results[key],
                content: (s.results[key]?.content ?? "") + text,
              },
            },
          }));
        },

        onDone: (provider, model, latencyMs, tokens) => {
          const key = `${provider}:${model}`;
          set((s) => ({
            results: {
              ...s.results,
              [key]: { ...s.results[key], done: true, latencyMs, tokens },
            },
          }));
        },

        onError: (provider, model, message) => {
          const key = `${provider}:${model}`;
          set((s) => ({
            results: {
              ...s.results,
              [key]: { ...s.results[key], done: true, error: message },
            },
          }));
        },

        onAllDone: (sessionId) => {
          set({ isComparing: false, currentSessionId: sessionId, _abortController: null });
          // Rafraîchir l'historique
          get().loadHistory();
        },

        onFatalError: (message) => {
          set({ isComparing: false, fatalError: message, _abortController: null });
        },
      },
    );

    set({ _abortController: controller });
  },

  stopComparison: () => {
    const { _abortController } = get();
    if (_abortController) _abortController.abort();
    set({ isComparing: false, _abortController: null });
  },

  loadHistory: async () => {
    try {
      const token = useAuthStore.getState().getToken();
      const res = await fetch(`${API_URL}/api/compare/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const sessions = await res.json();
      set({ sessions });
    } catch {
      // silencieux
    }
  },

  clearResults: () => {
    set({ results: {}, currentSessionId: null, fatalError: null });
  },
}));
