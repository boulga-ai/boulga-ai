// boulga/frontend/store/chatStore.ts
import { create } from "zustand";
import {
  getLLMs,
  getConversations,
  getConversation,
  deleteConversation as apiDeleteConversation,
} from "@/lib/api";
import { streamChat, type RoutingInfo } from "@/lib/stream";
import { StreamErrorCode } from "@/lib/errorCodes";
import { API_URL } from "@/lib/constants";
import { useDocStore } from "@/store/docStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useToastStore } from "@/store/toastStore";
import type { Conversation, Message, LLM, EffortLevel, AgentStep } from "@/types";

const LONG_RESPONSE_WORDS = 500;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Cookie model persistence ──────────────────────────────────────────────────

function getModelFromCookie(): { provider: string; model: string } | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("boulga_model="));
  if (!entry) return null;
  const val = entry.slice("boulga_model=".length);
  const sep = val.indexOf(":");
  if (sep < 1) return null;
  const provider = val.slice(0, sep);
  const model = val.slice(sep + 1);
  if (!provider || !model) return null;
  return { provider, model };
}

function setModelCookie(provider: string, model: string) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `boulga_model=${provider}:${model};expires=${expires};path=/;SameSite=Strict`;
}

// ── Types internes ────────────────────────────────────────────────────────────

interface OptimisticMessage extends Omit<Message, "id" | "created_at" | "file_ids"> {
  id: string;
  created_at: string;
  file_ids: string[];
}

// ── État ──────────────────────────────────────────────────────────────────────

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  llms: LLM[];
  selectedProvider: string;
  selectedModel: string;
  isStreaming: boolean;
  streamingText: string;

  // Routage Automatique
  autoRoute: boolean;
  routingInfo: RoutingInfo | null;

  // Niveau d'effort
  effort: EffortLevel;

  // Recherche web
  enableSearch: boolean;

  // Étapes agentiques (tool calls visibles pendant le streaming)
  agentSteps: AgentStep[];

  // AbortController courant (non exposé directement)
  _abortController: AbortController | null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface ChatActions {
  loadLLMs: () => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (text: string, fileIds?: string[]) => Promise<void>;
  regenerateMessage: (assistantMessageId: string) => void;
  stopStreaming: () => void;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  selectProvider: (provider: string) => void;
  selectModel: (model: string) => void;
  toggleAutoRoute: () => void;
  clearRoutingInfo: () => void;
  setEffort: (e: EffortLevel) => void;
  toggleSearch: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const _savedModel = getModelFromCookie();

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // État initial
  conversations: [],
  currentConversationId: null,
  messages: [],
  llms: [],
  selectedProvider: _savedModel?.provider ?? "gemini",
  selectedModel: _savedModel?.model ?? "gemini-2.5-flash",
  isStreaming: false,
  streamingText: "",
  autoRoute: false,
  routingInfo: null,
  effort: "medium",
  enableSearch: false,
  agentSteps: [],
  _abortController: null,

  // ── Actions ──────────────────────────────────────────────────────────

  loadLLMs: async () => {
    try {
      const llms = await getLLMs();
      set({ llms });
    } catch {
      // erreur silencieuse
    }
  },

  loadConversations: async () => {
    try {
      const conversations = await getConversations();
      set({ conversations });
    } catch {
      // erreur silencieuse
    }
  },

  loadConversation: async (id: string) => {
    const { _abortController } = get();
    if (_abortController) {
      _abortController.abort();
    }
    set({
      isStreaming: false,
      streamingText: "",
      _abortController: null,
    });

    try {
      const detail = await getConversation(id);
      const msgs = detail.messages;

      let lastProvider = get().selectedProvider;
      let lastModel = get().selectedModel;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === "assistant" && m.provider && m.model_id) {
          lastProvider = m.provider;
          lastModel = m.model_id;
          break;
        }
      }

      // Restaurer les fichiers générés depuis l'API
      const docState = useDocStore.getState();
      for (const f of detail.generated_files ?? []) {
        if (!docState.artifacts.some((a) => a.id === f.id)) {
          docState.addArtifact({
            id: f.id,
            messageId: f.message_id ?? undefined,
            name: f.original_name,
            url: `${API_URL}/api/files/${f.id}/download`,
            mimeType: f.mime_type,
            size: f.size_bytes,
            createdAt: Date.now(),
          });
        }
      }

      set({
        currentConversationId: id,
        messages: msgs,
        selectedProvider: lastProvider,
        selectedModel: lastModel,
      });
    } catch {
      // erreur silencieuse
    }
  },

  sendMessage: async (text: string, fileIds: string[] = []) => {
    const {
      currentConversationId,
      selectedProvider,
      selectedModel,
      isStreaming,
      autoRoute,
      effort,
      enableSearch,
    } = get();

    if (isStreaming) return;

    const now = new Date().toISOString();
    const optimisticUserId = `optimistic-user-${Date.now()}`;
    const optimisticAssistantId = `optimistic-assistant-${Date.now()}`;

    const userMsg: OptimisticMessage = {
      id: optimisticUserId,
      conversation_id: currentConversationId ?? "",
      role: "user",
      content: text,
      provider: selectedProvider as Message["provider"],
      model_id: selectedModel,
      file_ids: fileIds,
      created_at: now,
    };

    const assistantMsg: OptimisticMessage = {
      id: optimisticAssistantId,
      conversation_id: currentConversationId ?? "",
      role: "assistant",
      content: "",
      provider: selectedProvider as Message["provider"],
      model_id: selectedModel,
      file_ids: [],
      created_at: now,
    };

    set((s) => ({
      messages: [...s.messages, userMsg as Message, assistantMsg as Message],
      isStreaming: true,
      streamingText: "",
      routingInfo: null,
      agentSteps: [],
    }));

    const controller = streamChat(
      {
        message: text,
        provider: selectedProvider,
        model_id: selectedModel,
        conversation_id: currentConversationId,
        file_ids: fileIds,
        auto_route: autoRoute,
        effort,
        enable_search: enableSearch,
      },
      {
        onConversation: (id, isNew) => {
          set((s) => {
            const updatedMessages = s.messages.map((m) =>
              m.conversation_id === "" ? { ...m, conversation_id: id } : m,
            );
            if (isNew) {
              return {
                currentConversationId: id,
                messages: updatedMessages,
              };
            }
            return { currentConversationId: id, messages: updatedMessages };
          });
        },

        onRouting: (info) => {
          set({ routingInfo: info });
        },

        onChunk: (chunk) => {
          set((s) => ({ streamingText: s.streamingText + chunk }));
        },

        onDocChunk: (text) => {
          useDocStore.getState().appendDocChunk(text);
        },

        onTitle: (title) => {
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === get().currentConversationId ? { ...c, title } : c,
            ),
          }));
        },

        onFileReady: (info) => {
          useDocStore.getState().addArtifact({
            id: info.file_id,
            messageId: info.message_id ?? undefined,
            name: info.filename,
            url: info.url.startsWith("/api/") ? `${API_URL}${info.url}` : info.url,
            mimeType: info.mime_type,
            size: info.size,
            createdAt: Date.now(),
          });
        },

        onToolStart: (id, tool, args) => {
          set((s) => ({
            agentSteps: [
              ...s.agentSteps,
              { id, tool, status: "running" as const, args },
            ],
          }));
        },

        onToolResult: (tool, success, detail) => {
          set((s) => {
            const steps = [...s.agentSteps];
            for (let i = steps.length - 1; i >= 0; i--) {
              if (steps[i].tool === tool && steps[i].status === "running") {
                steps[i] = {
                  ...steps[i],
                  status: success ? ("done" as const) : ("error" as const),
                  detail,
                };
                break;
              }
            }
            return { agentSteps: steps };
          });
        },

        onImageNotSupported: (_provider, message) => {
          useToastStore.getState().addToast({
            type: "info",
            title: "Génération d'images non disponible",
            message,
          });
        },

        onDone: (messageId) => {
          const finalText = get().streamingText.trimEnd();
          const docState = useDocStore.getState();

          if (docState.isStreamingDoc) {
            docState.finishDocStream();
          }

          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === optimisticAssistantId
                ? { ...m, id: messageId, content: finalText }
                : m,
            ),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));

          if (countWords(finalText) > LONG_RESPONSE_WORDS) {
            const ds = useDocStore.getState();
            if (ds.currentArtifactIndex === null && !ds.currentDocument) {
              ds.openDocument(finalText);
            }
          }

          get().loadConversations();
          useSubscriptionStore.getState().loadSubscription();
        },

        onError: (message, code) => {
          set((s) => ({
            messages: s.messages.filter(
              (m) => m.id !== optimisticAssistantId && m.id !== optimisticUserId,
            ),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));

          // `code` typé en priorité ; repli sur `message` pour rétrocompat avec
          // un backend qui n'émettrait pas encore le champ `code`.
          const errorCode = code ?? message;

          if (errorCode === StreamErrorCode.QuotaExceeded) {
            useSubscriptionStore.getState().setShowQuotaModal(true);
          } else if (errorCode === StreamErrorCode.ModelAccessDenied) {
            useToastStore.getState().addToast({
              type: "info",
              title: "Modèle non disponible",
              message: "Ce modèle n'est pas inclus dans votre offre actuelle.",
              action: { label: "Voir les offres", href: "/pricing" },
            });
          } else if (errorCode === StreamErrorCode.FileQuotaExceeded) {
            useToastStore.getState().addToast({
              type: "warning",
              title: "Limite de fichiers atteinte",
              message: "Vous avez atteint votre quota de génération de fichiers. Passez à un plan supérieur pour continuer.",
              action: { label: "Voir les offres", href: "/pricing" },
            });
          } else {
            useToastStore.getState().addToast({
              type: "warning",
              title: "Erreur",
              message: message.length > 200 ? "Une erreur est survenue. Veuillez réessayer." : message,
            });
          }
        },
      },
    );

    set({ _abortController: controller });
  },

  regenerateMessage: (assistantMessageId: string) => {
    const { messages, selectedProvider, selectedModel, currentConversationId, isStreaming } = get();
    if (isStreaming) return;

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 0) return;

    let userMsg: Message | undefined;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") { userMsg = messages[i]; break; }
    }
    if (!userMsg) return;

    const regenId = `optimistic-regen-${Date.now()}`;
    const now = new Date().toISOString();

    set((s) => ({
      messages: [
        ...s.messages.slice(0, assistantIdx),
        {
          ...s.messages[assistantIdx],
          id: regenId,
          content: "",
          created_at: now,
        },
      ],
      isStreaming: true,
      streamingText: "",
    }));

    const controller = streamChat(
      {
        message: userMsg.content,
        provider: selectedProvider,
        model_id: selectedModel,
        conversation_id: currentConversationId,
        file_ids: userMsg.file_ids ?? [],
      },
      {
        onConversation: () => { },
        onChunk: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
        onDocChunk: (text) => {
          useDocStore.getState().appendDocChunk(text);
        },
        onTitle: () => { },
        onFileReady: (info) => {
          useDocStore.getState().addArtifact({
            id: info.file_id,
            messageId: info.message_id ?? undefined,
            name: info.filename,
            url: info.url.startsWith("/api/") ? `${API_URL}${info.url}` : info.url,
            mimeType: info.mime_type,
            size: info.size,
            createdAt: Date.now(),
          });
        },
        onDone: (messageId) => {
          const finalText = get().streamingText;
          const docState = useDocStore.getState();

          if (docState.isStreamingDoc) {
            docState.finishDocStream();
          }

          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === regenId ? { ...m, id: messageId, content: finalText } : m,
            ),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));

          if (countWords(finalText) > LONG_RESPONSE_WORDS) {
            const ds = useDocStore.getState();
            if (ds.currentArtifactIndex === null && !ds.currentDocument) {
              ds.openDocument(finalText);
            }
          }
        },
        onError: (errMsg) => {
          set((s) => ({
            messages: s.messages.filter((m) => m.id !== regenId),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));
          console.error("[Boulga regen]", errMsg);
        },
      },
    );

    set({ _abortController: controller });
  },

  stopStreaming: () => {
    const { _abortController, streamingText } = get();
    if (_abortController) {
      _abortController.abort();
    }
    set((s) => ({
      messages: s.messages.map((m) =>
        m.role === "assistant" && m.content === ""
          ? { ...m, content: streamingText }
          : m,
      ),
      isStreaming: false,
      streamingText: "",
      _abortController: null,
    }));
  },

  newConversation: () => {
    const { _abortController } = get();
    if (_abortController) {
      _abortController.abort();
    }
    set({
      currentConversationId: null,
      messages: [],
      streamingText: "",
      isStreaming: false,
      _abortController: null,
    });
  },

  deleteConversation: async (id: string) => {
    try {
      await apiDeleteConversation(id);
      set((s) => {
        const conversations = s.conversations.filter((c) => c.id !== id);
        const reset =
          s.currentConversationId === id
            ? { currentConversationId: null, messages: [] }
            : {};
        return { conversations, ...reset };
      });
    } catch (err) {
      console.error("[Boulga] Erreur suppression conversation :", err);
    }
  },

  selectProvider: (provider: string) => {
    setModelCookie(provider, get().selectedModel);
    set({ selectedProvider: provider });
  },
  selectModel: (model: string) => {
    setModelCookie(get().selectedProvider, model);
    set({ selectedModel: model });
  },

  toggleAutoRoute: () => set((s) => ({ autoRoute: !s.autoRoute })),
  clearRoutingInfo: () => set({ routingInfo: null }),
  setEffort: (e: EffortLevel) => set({ effort: e }),
  toggleSearch: () => set((s) => ({ enableSearch: !s.enableSearch })),
}));
