"use client";

import { useEffect } from "react";
import Navigation from "@/components/nav/Navigation";
import { useAuthStore } from "@/store/authStore";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadUser = useAuthStore((s) => s.loadUser);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-bg">
        <div className="flex gap-1">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Navigation />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
