import React from "react";

type BadgeVariant = "pro" | "gratuit" | "actif" | "bientôt" | "expiré";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  pro: "bg-blue-100 text-blue-700 border border-blue-200",
  gratuit: "bg-neutral-bg text-neutral-text-secondary border border-neutral-border",
  actif: "bg-tint-success text-success border border-success",
  bientôt: "bg-tint-warning text-warning border border-warning",
  expiré: "bg-tint-error text-error border border-error",
};

export default function Badge({
  variant = "gratuit",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-1
        text-caption rounded-full
        font-body font-500
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
