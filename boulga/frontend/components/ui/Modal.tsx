"use client";

import React from "react";
import { IconX } from "@tabler/icons-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div
        className="
          relative bg-neutral-white rounded-xl
          shadow-lg max-w-lg w-full mx-4
          max-h-[90vh] overflow-y-auto
          animate-in fade-in zoom-in-95 duration-300
        "
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-border">
            <h2 className="text-h2 font-body font-500 text-neutral-text">
              {title}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-neutral-text-tertiary hover:text-neutral-text transition-colors"
              aria-label="Fermer"
            >
              <IconX size={24} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-neutral-border p-6 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-body font-body text-neutral-text ${className}`}>
      {children}
    </div>
  );
}
