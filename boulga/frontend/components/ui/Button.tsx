import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-700 text-neutral-white hover:bg-blue-800 active:bg-blue-900",
  secondary:
    "bg-neutral-border text-neutral-text hover:bg-[#d0d4dc] active:bg-[#c0c4cc]",
  ghost:
    "bg-transparent text-blue-700 hover:bg-blue-50 active:bg-blue-100",
  destructive:
    "bg-error text-neutral-white hover:bg-[#b71c1c] active:bg-[#a71919]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-ui rounded-md font-body font-400",
  md: "px-4 py-2.5 text-body rounded-md font-body font-400",
  lg: "px-6 py-3 text-body rounded-md font-body font-500",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        font-body
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    />
  );
}
