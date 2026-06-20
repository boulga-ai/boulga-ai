import { create } from "zustand";
import type { User } from "@/types";

const TOKEN_KEY = "boulga_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ── État ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface AuthActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user: User, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const { API_URL } = await import("@/lib/constants");
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { localStorage.removeItem(TOKEN_KEY); return; }
      const data = await res.json();
      set({ user: data, isAuthenticated: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
}));
