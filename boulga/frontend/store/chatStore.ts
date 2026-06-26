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
import type { Conversation, Message, LLM, EffortLevel } from "@/types";

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

  // Génération de fichier (progression)
  isBuilding: boolean;
  buildingLogs: string[];

  // Routage Automatique
  autoRoute: boolean;
  routingInfo: RoutingInfo | null;

  // Niveau d'effort
  effort: EffortLevel;

  // Recherche web
  enableSearch: boolean;

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
  selectedModel:    _savedModel?.model    ?? "gemini-2.5-flash",
  isStreaming: false,
  streamingText: "",
  isBuilding: false,
  buildingLogs: [],
  autoRoute: false,
  routingInfo: null,
  effort: "medium",
  enableSearch: false,
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
    // Interrompre tout streaming en cours (changement de conversation pendant génération)
    const { _abortController } = get();
    if (_abortController) {
      _abortController.abort();
    }
    set({
      isStreaming: false,
      streamingText: "",
      isBuilding: false,
      buildingLogs: [],
      _abortController: null,
    });

    try {
      const detail = await getConversation(id);
      const msgs = detail.messages;

      // 1. Restaurer le dernier provider/model utilisé dans cette conversation
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

      // 2. Reconstruire fileReady depuis les tags <!--boulga-file:{...}--> embarqués en DB
      //    et appliquer le préfixe /backend aux URLs /api/ (identique à onFileReady)
      // Le JSON embarqué dans le tag est compact (json.dumps sans indent) — pas de /s nécessaire
      const FILE_TAG_RE = /<!--boulga-file:(\{.*?\})-->/;
      const parsedMsgs = msgs.map((msg) => {
        if (msg.role !== "assistant" || !msg.content) return msg;
        const match = FILE_TAG_RE.exec(msg.content);
        if (!match) return msg;
        try {
          const fileData = JSON.parse(match[1]);
          const cleanContent = msg.content.replace(FILE_TAG_RE, "").trimEnd();
          const rawUrl = (fileData.url as string) ?? "";
          const url = rawUrl.startsWith("/api/") ? `/backend${rawUrl}` : rawUrl;
          return {
            ...msg,
            content: cleanContent,
            fileReady: {
              url,
              name:     (fileData.name    as string) ?? "",
              size:     (fileData.size    as number) ?? 0,
              mimeType: fileData.mimeType as string | undefined,
              summary:  fileData.summary  as string | undefined,
            },
          };
        } catch {
          return msg;
        }
      });

      // 3. Ajouter les fichiers restaurés au docStore (pour que le bouton "Ouvrir" fonctionne)
      const docState = useDocStore.getState();
      for (const msg of parsedMsgs) {
        if (!msg.fileReady) continue;
        const { url, name, size, mimeType } = msg.fileReady;
        // Éviter les doublons si la conversation est rechargée plusieurs fois
        if (!docState.artifacts.some((a) => a.url === url)) {
          docState.addArtifact({
            id: `artifact-restored-${name}-${size}`,
            name,
            url,
            mimeType: mimeType ?? "application/octet-stream",
            size,
            createdAt: Date.now(),
          });
        }
      }

      set({
        currentConversationId: id,
        messages: parsedMsgs as typeof msgs,
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
        effort,
        enable_search: enableSearch,
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

        onImageNotSupported: (_provider, message) => {
          useToastStore.getState().addToast({
            type:    "info",
            title:   "Génération d'images non disponible",
            message,
          });
        },

        onFileBuildingStep: (step: string) => {
          set((s) => ({
            isBuilding: true,
            buildingLogs: [...s.buildingLogs, step],
          }));
        },

        onFileGenerationError: (message) => {
          set({ isBuilding: false, buildingLogs: [] });
          useToastStore.getState().addToast({
            type:    "warning",
            title:   "Fichier non généré",
            message,
          });
        },

        onFileReady: (url, name, mimeType, sizeBytes, isImage, summary) => {
          // Fin de la construction — reset building state
          set({ isBuilding: false, buildingLogs: [] });

          // URL directe (Supabase signée) ou fallback proxy backend
          const fullUrl = url.startsWith("/api/") ? `/backend${url}` : url;

          // Créer l'artifact et l'ajouter au store (ouvre le panel automatiquement)
          useDocStore.getState().addArtifact({
            id: `artifact-${Date.now()}`,
            name,
            url: fullUrl,
            mimeType,
            size: sizeBytes,
            createdAt: Date.now(),
          });

          if (isImage) {
            // Injecter aussi l'image inline dans la bulle pour contexte visuel
            set((s) => {
              const messages = [...s.messages];
              for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === "assistant") {
                  const current = messages[i].content ?? "";
                  messages[i] = {
                    ...messages[i],
                    content: current + `\n\n![Image générée](${fullUrl})`,
                  };
                  break;
                }
              }
              return { messages };
            });
            set((s) => ({
              streamingText: s.streamingText + `\n\n![Image générée](${fullUrl})`,
            }));
          }

          // Stocker fileReady sur le message pour la artifact card dans la bulle
          set((s) => {
            const messages = [...s.messages];
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "assistant") {
                messages[i] = { ...messages[i], fileReady: { url: fullUrl, name, size: sizeBytes, mimeType, summary } };
                break;
              }
            }
            return { messages };
          });

          useToastStore.getState().addToast({
            type:    "info",
            title:   isImage ? "Image générée" : "Fichier prêt",
            message: name,
          });
        },

        onDone: (messageId) => {
          // Filet de sécurité : supprimer tout tag <!--boulga-file:--> que le LLM
          // aurait pu générer (ne devrait plus arriver après le fix backend)
          const FILE_TAG_RE = /<!--boulga-file:\{.*?\}-->/g;
          const finalText = get().streamingText.replace(FILE_TAG_RE, "").trimEnd();
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === optimisticAssistantId
                ? { ...m, id: messageId, content: finalText }
                : m,
            ),
            isStreaming: false,
            streamingText: "",
            isBuilding: false,
            buildingLogs: [],
            _abortController: null,
          }));

          // Ouvrir le panneau document si la réponse est longue,
          // MAIS seulement si aucun artifact n'a été généré dans ce message
          // (l'artifact ouvre déjà le panel, on ne veut pas l'écraser)
          if (countWords(finalText) > LONG_RESPONSE_WORDS) {
            const docState = useDocStore.getState();
            if (docState.currentArtifactIndex === null) {
              const doc = docState.currentDocument;
              if (doc) {
                docState.updateDocument(finalText);
              } else {
                docState.openDocument(finalText);
              }
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
              (m) => m.id !== optimisticAssistantId && m.id !== optimisticUserId,
            ),
            isStreaming: false,
            streamingText: "",
            isBuilding: false,
            buildingLogs: [],
            _abortController: null,
          }));

          // Quota épuisé → ouvrir la modal bloquante
          if (message === "quota_exceeded") {
            useSubscriptionStore.getState().setShowQuotaModal(true);
          }
          // Modèle / provider non accessible
          if (message === "model_access_denied") {
            useToastStore.getState().addToast({
              type: "info",
              title: "Provider non disponible",
              message: "Ce modèle n'est pas encore disponible. Seul Gemini est actif pour le moment.",
            });
          }
          // Quota fichiers épuisé → toast avec lien vers /pricing
          if (message === "file_quota_exceeded") {
            useToastStore.getState().addToast({
              type: "warning",
              title: "Limite de fichiers atteinte",
              message: "Vous avez atteint votre quota de génération de fichiers. Passez à un plan supérieur pour continuer.",
              action: { label: "Voir les offres", href: "/pricing" },
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
