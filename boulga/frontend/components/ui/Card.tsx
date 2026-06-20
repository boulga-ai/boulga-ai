import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-neutral-white
        border border-neutral-border
        rounded-lg
        p-4
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pb-3 border-b border-neutral-border ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-h2 font-body font-500 text-neutral-text ${className}`}>
      {children}
    </h2>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        pt-4 mt-4
        border-t border-neutral-border
        flex gap-2 justify-end
        ${className}
      `}
    >
      {children}
    </div>
  );
}
