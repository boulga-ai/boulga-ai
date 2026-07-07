"use client";

import { useState } from "react";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import ConversationList from "@/components/sidebar-left/ConversationList";
import DocumentPanel from "@/components/sidebar-right/DocumentPanel";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar desktop ──────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col border-r border-neutral-border flex-shrink-0 bg-neutral-white overflow-hidden transition-[width] duration-200
          ${sidebarOpen ? "w-60" : "w-0 border-r-0"}`}
      >
        {/* En-tête sidebar avec bouton collapse */}
        <div className="flex items-center justify-between h-10 px-3 border-b border-neutral-border flex-shrink-0">
          <span className="text-[11px] font-body font-medium text-neutral-text-tertiary uppercase tracking-wide">
            Conversations
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-text-tertiary hover:text-marine hover:bg-neutral-bg transition-colors duration-100"
            aria-label="Masquer la sidebar"
            title="Masquer"
          >
            <IconLayoutSidebarLeftCollapse size={16} />
          </button>
        </div>
        <ConversationList />
      </aside>

      {/* ── Drawer mobile ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="w-72 bg-neutral-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between h-12 px-4 border-b border-neutral-border flex-shrink-0">
              <span className="text-uism font-body font-medium text-marine">
                Conversations
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-neutral-text-tertiary hover:text-marine transition-colors duration-100"
                aria-label="Fermer"
              >
                <IconX size={18} />
              </button>
            </div>
            <ConversationList onMobileClose={() => setDrawerOpen(false)} />
          </aside>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* ── Zone principale ───────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar mobile */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-neutral-border flex-shrink-0 bg-neutral-white">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            aria-label="Ouvrir la liste des conversations"
          >
            <IconMenu2 size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-5 h-5 rounded-md ml-3" />
          <span className="ml-2 text-uism font-body font-medium text-marine">Boulga</span>
        </div>

        {/* Bouton "rouvrir sidebar" — desktop, visible seulement quand sidebar masquée */}
        {!sidebarOpen && (
          <div className="hidden md:flex absolute top-2 left-2 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-text-tertiary hover:text-marine hover:bg-neutral-bg border border-neutral-border bg-neutral-white shadow-sm transition-colors duration-100"
              aria-label="Afficher la sidebar"
              title="Afficher les conversations"
            >
              <IconLayoutSidebarLeftExpand size={16} />
            </button>
          </div>
        )}

        {children}
      </div>

      {/* ── Panneau document ──────────────────────────────────────────────── */}
      <DocumentPanel />
    </div>
  );
}
