import { create } from "zustand";
import { API_URL } from "@/lib/constants";
import type { User } from "@/types";

// ── État ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _accessToken: string | null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface AuthActions {
  setUser: (user: User, token: string) => void;
  getToken: () => string | null;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  _accessToken: null,

  setUser: (user: User, token: string) => {
    set({ user, isAuthenticated: true, _accessToken: token });
  },

  getToken: () => get()._accessToken,

  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Silencieux — on déconnecte côté client dans tous les cas
    }
    set({ user: null, isAuthenticated: false, _accessToken: null });
  },

  loadUser: async () => {
    // Déjà authentifié (juste après un login) — ne pas écraser
    if (get().isAuthenticated) return;

    // Tentative de refresh silencieux depuis le cookie httpOnly
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, _accessToken: null });
        return;
      }
      const data = await res.json();
      set({ user: data.user, isAuthenticated: true, _accessToken: data.access_token });
    } catch {
      set({ user: null, isAuthenticated: false, _accessToken: null });
    }
  },
}));
