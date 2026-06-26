"use client";

import Link from "next/link";
import { IconX } from "@tabler/icons-react";
import { useToastStore, type ToastType, type ToastItem } from "@/store/toastStore";

export type { ToastType };

// ── Hook (lecture depuis le store Zustand) ────────────────────────────────────

export function useToast() {
  const addToast   = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);
  return { addToast, removeToast };
}

// ── Provider (simple wrapper — rendu du container) ────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Styles par type ───────────────────────────────────────────────────────────

const typeStyles: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: "bg-[#e8f5e9]", border: "border-success" },
  error:   { bg: "bg-[#ffebee]", border: "border-error" },
  info:    { bg: "bg-blue-50",   border: "border-blue-700" },
  warning: { bg: "bg-[#fff3e0]", border: "border-warning" },
};

// ── Conteneur de toasts (à placer une fois dans le layout) ───────────────────

export function ToastContainer() {
  const toasts     = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const styles = typeStyles[toast.type];

  return (
    <div
      className={`
        ${styles.bg} border ${styles.border}
        rounded-lg p-4 max-w-sm shadow-md pointer-events-auto
        animate-in fade-in slide-in-from-right-4 duration-300
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-body font-body font-medium text-marine">{toast.title}</p>
          {toast.message && (
            <p className="text-caption font-body text-neutral-text-secondary mt-1">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <Link
              href={toast.action.href}
              className="inline-block mt-2 text-caption font-body font-medium text-blue-700 hover:underline"
            >
              {toast.action.label} →
            </Link>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-neutral-text-tertiary hover:text-neutral-text transition-colors"
          aria-label="Fermer"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
