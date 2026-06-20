"use client";

import { useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import ConversationList from "@/components/sidebar-left/ConversationList";
import DocumentPanel from "@/components/sidebar-right/DocumentPanel";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar desktop (240px) */}
      <aside className="hidden md:flex flex-col w-60 border-r border-neutral-border flex-shrink-0 bg-neutral-white">
        <ConversationList />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Panneau */}
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
          {/* Overlay */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar mobile (hamburger) */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-neutral-border flex-shrink-0 bg-neutral-white">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            aria-label="Ouvrir la liste des conversations"
          >
            <IconMenu2 size={20} />
          </button>
          <span className="ml-3 text-uism font-body font-medium text-marine">
            Boulga
          </span>
        </div>

        {children}
      </div>

      {/* Panneau document (colonne droite desktop, plein écran mobile) */}
      <DocumentPanel />
    </div>
  );
}
