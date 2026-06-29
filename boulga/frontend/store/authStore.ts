import { create } from "zustand";
import { API_URL } from "@/lib/constants";
import type { User } from "@/types";

// ── État ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface AuthActions {
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Silencieux — on déconnecte côté client dans tous les cas
    }
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await get().refreshToken();
          if (!refreshed) {
            set({ user: null, isAuthenticated: false });
            return;
          }
          const retry = await fetch(`${API_URL}/api/auth/me`, {
            credentials: "include",
          });
          if (!retry.ok) {
            set({ user: null, isAuthenticated: false });
            return;
          }
          const data = await retry.json();
          set({ user: data, isAuthenticated: true });
          return;
        }
        set({ user: null, isAuthenticated: false });
        return;
      }
      const data = await res.json();
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  refreshToken: async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  },
}));
