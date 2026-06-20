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

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
