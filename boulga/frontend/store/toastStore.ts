import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistant
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
    return id;
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
