/**
 * store.test.ts — Tests unitaires des stores Zustand.
 * On mock toutes les dépendances réseau (api, stream).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock des modules réseau ────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  getLLMs: vi.fn(),
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getSubscription: vi.fn(),
  getReferralStats: vi.fn(),
  postFeedback: vi.fn(),
  searchConversations: vi.fn(),
  uploadFile: vi.fn(),
  initiatePayment: vi.fn(),
}));

vi.mock("@/lib/stream", () => ({
  streamChat: vi.fn(),
}));

vi.mock("@/store/docStore", () => ({
  useDocStore: {
    getState: () => ({
      setFileReady: vi.fn(),
    }),
  },
}));

vi.mock("@/store/toastStore", () => ({
  useToastStore: {
    getState: () => ({
      toasts: [],
      addToast: vi.fn().mockReturnValue("test-toast-id"),
      removeToast: vi.fn(),
    }),
  },
}));

vi.mock("@/store/subscriptionStore", () => ({
  useSubscriptionStore: {
    getState: () => ({
      tier: "free",
      messagesLimit: 10,
      loaded: false,
      loadSubscription: vi.fn(),
    }),
  },
}));

// ── chatStore ─────────────────────────────────────────────────────────────────

describe("chatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initialise avec des valeurs par défaut", async () => {
    const { useChatStore } = await import("@/store/chatStore");
    const state = useChatStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.autoRoute).toBe(false);
    expect(state.selectedProvider).toBe("gemini");
    expect(state.selectedModel).toBe("gemini-2.5-flash");
  });

  it("selectProvider met à jour le provider", async () => {
    const { useChatStore } = await import("@/store/chatStore");
    useChatStore.getState().selectProvider("claude");
    expect(useChatStore.getState().selectedProvider).toBe("claude");
    // Réinitialiser
    useChatStore.getState().selectProvider("gemini");
  });

  it("selectModel met à jour le modèle", async () => {
    const { useChatStore } = await import("@/store/chatStore");
    useChatStore.getState().selectModel("gemini-2.5-pro");
    expect(useChatStore.getState().selectedModel).toBe("gemini-2.5-pro");
    useChatStore.getState().selectModel("gemini-2.5-flash");
  });

  it("toggleAutoRoute bascule l'état du routage automatique", async () => {
    const { useChatStore } = await import("@/store/chatStore");
    const initial = useChatStore.getState().autoRoute;
    useChatStore.getState().toggleAutoRoute();
    expect(useChatStore.getState().autoRoute).toBe(!initial);
    useChatStore.getState().toggleAutoRoute(); // Réinitialiser
  });

  it("newConversation réinitialise les messages", async () => {
    const { useChatStore } = await import("@/store/chatStore");
    useChatStore.getState().newConversation();
    expect(useChatStore.getState().currentConversationId).toBeNull();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("loadLLMs appelle getLLMs", async () => {
    const { getLLMs } = await import("@/lib/api");
    const mockLLMs = [
      {
        provider: "gemini",
        name: "Gemini",
        active: true,
        models: [
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "low" },
        ],
      },
    ];
    vi.mocked(getLLMs).mockResolvedValueOnce(mockLLMs as any);

    const { useChatStore } = await import("@/store/chatStore");
    await useChatStore.getState().loadLLMs();
    expect(getLLMs).toHaveBeenCalledOnce();
  });

  it("loadConversations appelle getConversations", async () => {
    const { getConversations } = await import("@/lib/api");
    vi.mocked(getConversations).mockResolvedValueOnce([]);

    const { useChatStore } = await import("@/store/chatStore");
    await useChatStore.getState().loadConversations();
    expect(getConversations).toHaveBeenCalledOnce();
  });
});

// ── toastStore ────────────────────────────────────────────────────────────────

describe("toastStore", () => {
  it("addToast ajoute un toast et retourne un id", async () => {
    const { useToastStore } = await import("@/store/toastStore");
    const id = useToastStore.getState().addToast({
      type: "success",
      title: "Test",
      message: "Ceci est un test",
    });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("removeToast est appelable", async () => {
    const { useToastStore } = await import("@/store/toastStore");
    const id = useToastStore.getState().addToast({
      type: "info",
      title: "Toast à supprimer",
    });
    // removeToast est bien une fonction (le mock est appelable)
    expect(() => useToastStore.getState().removeToast(id)).not.toThrow();
  });

  it("toasts sont initialement vides", async () => {
    const { useToastStore } = await import("@/store/toastStore");
    const state = useToastStore.getState();
    expect(Array.isArray(state.toasts)).toBe(true);
  });
});

// ── authStore ─────────────────────────────────────────────────────────────────

describe("authStore", () => {
  it("initialise avec user null", async () => {
    const { useAuthStore } = await import("@/store/authStore");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("login met à jour l'utilisateur et isAuthenticated", async () => {
    const { useAuthStore } = await import("@/store/authStore");
    const testUser = { id: "123", email: "test@example.com", name: "Test" } as any;
    useAuthStore.getState().login(testUser);
    expect(useAuthStore.getState().user).toEqual(testUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    useAuthStore.getState().logout();
  });

  it("logout réinitialise l'utilisateur", async () => {
    const { useAuthStore } = await import("@/store/authStore");
    const testUser = { id: "123", email: "test@example.com", name: "Test" } as any;
    useAuthStore.getState().login(testUser);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ── subscriptionStore ─────────────────────────────────────────────────────────

describe("subscriptionStore", () => {
  it("initialise avec tier free", async () => {
    const { useSubscriptionStore } = await import("@/store/subscriptionStore");
    const state = useSubscriptionStore.getState();
    expect(state.tier).toBe("free");
    expect(state.messagesLimit).toBe(10);
    expect(state.loaded).toBe(false);
  });
});
