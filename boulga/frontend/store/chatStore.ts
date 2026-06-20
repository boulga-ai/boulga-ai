import { create } from "zustand";
import {
  getLLMs,
  getConversations,
  getConversation,
  deleteConversation as apiDeleteConversation,
} from "@/lib/api";
import { streamChat, type RoutingInfo } from "@/lib/stream";
import { useDocStore } from "@/store/docStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useToastStore } from "@/store/toastStore";
import type { Conversation, Message, LLM } from "@/types";

const LONG_RESPONSE_WORDS = 500;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // État initial
  conversations: [],
  currentConversationId: null,
  messages: [],
  llms: [],
  selectedProvider: "gemini",
  selectedModel: "gemini-2.5-flash",
  isStreaming: false,
  streamingText: "",
  autoRoute: false,
  routingInfo: null,
  _abortController: null,

  // ── Actions ──────────────────────────────────────────────────────────

  loadLLMs: async () => {
    try {
      const llms = await getLLMs();
      set({ llms });
    } catch {
      // erreur silencieuse — les LLMs seront rechargés au prochain rendu
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
    try {
      const detail = await getConversation(id);
      set({
        currentConversationId: id,
        messages: detail.messages,
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
    } = get();

    if (isStreaming) return;

    // Bulle utilisateur optimiste
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
    }));

    const controller = streamChat(
      {
        message: text,
        provider: selectedProvider,
        model_id: selectedModel,
        conversation_id: currentConversationId,
        file_ids: fileIds,
        auto_route: autoRoute,
      },
      {
        onConversation: (id, isNew) => {
          set((s) => {
            // Mettre à jour l'id de la conv courante
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

        onTitle: (title) => {
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === get().currentConversationId ? { ...c, title } : c,
            ),
          }));
        },

        onFileReady: (url, name, mimeType, sizeBytes, isImage) => {
          // Dériver l'extension depuis le mime_type
          const mimeToExt: Record<string, string> = {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
            "application/pdf": "pdf",
            "text/csv": "csv",
            "text/plain": "txt",
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/webp": "webp",
          };
          const format = mimeToExt[mimeType] ?? mimeType.split("/").pop() ?? "file";

          // Préfixer l'URL avec /backend pour le proxy Next.js
          const fullUrl = url.startsWith("/api/") ? `/backend${url}` : url;

          if (isImage) {
            // Image générée → injection inline dans la bulle assistant
            set((s) => {
              const messages = [...s.messages];
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === "assistant") {
                  const current = messages[i].content ?? "";
                  messages[i] = {
                    ...messages[i],
                    content: current + `\n\n![Image générée](${fullUrl})`,
                    fileReady: { url: fullUrl, name, size: sizeBytes },
                  };
                  break;
                }
              }
              return { messages };
            });
            // Aussi mettre à jour streamingText pour la cohérence
            set((s) => ({
              streamingText: s.streamingText + `\n\n![Image générée](${fullUrl})`,
            }));

            useToastStore.getState().addToast({
              type:    "info",
              title:   "Image générée",
              message: `${name} — visible dans la conversation.`,
            });
          } else {
            // Fichier bureautique → DocumentPanel
            useDocStore.getState().setFileReady({ url: fullUrl, name, format, size: sizeBytes });

            set((s) => {
              const messages = [...s.messages];
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === "assistant") {
                  messages[i] = { ...messages[i], fileReady: { url: fullUrl, name, size: sizeBytes } };
                  break;
                }
              }
              return { messages };
            });

            useToastStore.getState().addToast({
              type:    "info",
              title:   "Votre fichier est prêt",
              message: `${name} — cliquez pour le télécharger.`,
            });
          }
        },

        onDone: (messageId) => {
          const finalText = get().streamingText;
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

          // Ouvrir le panneau document si la réponse est longue
          if (countWords(finalText) > LONG_RESPONSE_WORDS) {
            const doc = useDocStore.getState().currentDocument;
            if (doc) {
              useDocStore.getState().updateDocument(finalText);
            } else {
              useDocStore.getState().openDocument(finalText);
            }
          }

          // Rafraîchir la liste des conversations (titre potentiellement mis à jour)
          get().loadConversations();
          // Rafraîchir le quota affiché
          useSubscriptionStore.getState().loadSubscription();
        },

        onError: (message) => {
          set((s) => ({
            messages: s.messages.filter(
              (m) => m.id !== optimisticAssistantId,
            ),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));

          // Quota épuisé → ouvrir la modal bloquante
          if (message === "quota_exceeded") {
            useSubscriptionStore.getState().setShowQuotaModal(true);
          }
          // Modèle non accessible → toast explicatif
          if (message === "model_access_denied") {
            useToastStore.getState().addToast({
              type: "info",
              title: "Plan requis",
              message: "Ce modèle n'est pas disponible sur votre abonnement actuel.",
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

    // Message utilisateur précédant cette bulle
    let userMsg: Message | undefined;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") { userMsg = messages[i]; break; }
    }
    if (!userMsg) return;

    const regenId = `optimistic-regen-${Date.now()}`;
    const now = new Date().toISOString();

    // Remplacer la bulle assistant par une bulle vide
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
        onConversation: () => {},
        onChunk: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
        onTitle: () => {},
        onFileReady: () => {},
        onDone: (messageId) => {
          const finalText = get().streamingText;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === regenId ? { ...m, id: messageId, content: finalText } : m,
            ),
            isStreaming: false,
            streamingText: "",
            _abortController: null,
          }));
          // Mettre à jour le panneau document si la réponse régénérée est longue
          if (countWords(finalText) > LONG_RESPONSE_WORDS) {
            useDocStore.getState().updateDocument(finalText);
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
    // Finaliser la bulle assistant avec le texte partiel déjà reçu
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
    set({
      currentConversationId: null,
      messages: [],
      streamingText: "",
      isStreaming: false,
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

  selectProvider: (provider: string) => set({ selectedProvider: provider }),
  selectModel: (model: string) => set({ selectedModel: model }),

  toggleAutoRoute: () => set((s) => ({ autoRoute: !s.autoRoute })),
  clearRoutingInfo: () => set({ routingInfo: null }),
}));
