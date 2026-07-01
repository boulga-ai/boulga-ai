import { create } from "zustand";
import { API_URL } from "@/lib/constants";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,

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
      // silencieux — on déconnecte côté client dans tous les cas
    }
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    if (get().isAuthenticated) {
      set({ isAuthLoading: false });
      return;
    }

    try {
      // Le cookie access est envoyé automatiquement par le browser
      let res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      // Access token expiré → on tente un refresh silencieux
      if (res.status === 401) {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!refreshRes.ok) {
          set({ user: null, isAuthenticated: false, isAuthLoading: false });
          return;
        }
        // Le backend a posé un nouveau cookie access — on re-appelle /me
        res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });
      }

      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isAuthLoading: false });
        return;
      }

      const user: User = await res.json();
      set({ user, isAuthenticated: true, isAuthLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    }
  },
}));
