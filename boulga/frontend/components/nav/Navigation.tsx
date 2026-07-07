"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMessageChatbot,
  IconLayoutColumns,
  IconFileText,
  IconSettings,
  IconShield,
  IconDots,
  IconX,
} from "@tabler/icons-react";
import { useState, type ComponentType } from "react";
import { useAuthStore } from "@/store/authStore";
import type { Tier } from "@/types";

// Tiers ayant accès au Mode Comparaison
const SOURCE_PLUS: Tier[] = ["source", "fleuve", "ocean"];

const MAIN_NAV = [
  {
    label: "Hub LLM",
    href: "/chat",
    icon: IconMessageChatbot,
    gated: false,
  },
  {
    label: "Comparaison",
    href: "/compare",
    icon: IconLayoutColumns,
    gated: true, // Source+ uniquement
  },
  {
    label: "Documents",
    href: "/documents",
    icon: IconFileText,
    gated: false,
  },
];

const BOTTOM_NAV = [
  {
    label: "Paramètres",
    href: "/settings",
    icon: IconSettings,
    gated: false,
  },
];

// Tabs toujours visibles sur mobile (sans Comparaison)
const MOBILE_TABS = [
  { label: "Hub LLM",    href: "/chat",      icon: IconMessageChatbot },
  { label: "Documents",  href: "/documents",  icon: IconFileText },
  { label: "Paramètres", href: "/settings",   icon: IconSettings },
];

type RailIcon = ComponentType<{ size?: number | string; className?: string }>;

// Icône dans un chip discret (teinte légère à l'état actif) plutôt qu'un pavé plein —
// la zone cliquable reste 56px, seul le chip visible fait 40px.
function RailItem({
  href, label, icon: Icon, active, locked,
}: { href: string; label: string; icon: RailIcon; active: boolean; locked?: boolean }) {
  if (locked) {
    return (
      <div
        className="flex items-center justify-center w-14 h-14 flex-shrink-0"
        title="Disponible à partir de Source"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg text-neutral-text-tertiary opacity-40 cursor-not-allowed">
          <Icon size={22} />
        </div>
      </div>
    );
  }

  return (
    <Link href={href} className="flex items-center justify-center w-14 h-14 flex-shrink-0" title={label}>
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
          active ? "bg-blue-50 text-blue-700" : "text-neutral-text-tertiary hover:bg-neutral-bg"
        }`}
      >
        <Icon size={22} />
      </div>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const userTier: Tier = (user as unknown as { tier?: Tier })?.tier ?? "source";
  const hasCompareAccess = SOURCE_PLUS.includes(userTier);
  const isAdmin = user?.is_admin === true;

  const [plusOpen, setPlusOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop Sidebar — 60px fixe ─────────────────────────────────────── */}
      <nav className="hidden md:flex flex-col w-[60px] bg-neutral-white border-r border-neutral-border overflow-hidden">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center h-14 flex-shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="Boulga" className="w-6 h-6 rounded-md" />
        </Link>

        <hr className="border-neutral-border" />

        {/* Liens principaux */}
        <div className="flex-1 flex flex-col gap-1 p-2 pt-3">
          {MAIN_NAV.map((item) => (
            <RailItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              locked={item.gated && !hasCompareAccess}
            />
          ))}
        </div>

        <hr className="border-neutral-border" />

        {/* Liens du bas */}
        <div className="flex flex-col gap-1 p-2 pb-3">
          {BOTTOM_NAV.map((item) => (
            <RailItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
          {isAdmin && (
            <RailItem href="/admin" label="Administration" icon={IconShield} active={isActive("/admin")} />
          )}

          {/* Compte — bulle d'initiale */}
          <Link
            href="/settings"
            className="flex items-center justify-center w-14 h-14 flex-shrink-0"
            title={user?.name ?? "Compte"}
          >
            <div className="w-8 h-8 rounded-full bg-blue-700 text-neutral-white text-[12px] font-medium flex items-center justify-center flex-shrink-0 hover:bg-blue-900 transition-colors duration-200">
              {(user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </nav>

      {/* ── Mobile Tab Bar — bas fixe ────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-white border-t border-neutral-border z-30 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around h-16">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isSettingsTab = item.href === "/settings";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-16 min-w-[44px] transition-colors duration-200 ${
                  active
                    ? "text-blue-700"
                    : "text-neutral-text-tertiary"
                }`}
              >
                {isSettingsTab ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${active ? "bg-blue-700 text-neutral-white" : "bg-neutral-border text-neutral-text-secondary"}`}>
                    {(user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Icon size={22} />
                )}
                <span className="text-[10px] font-body mt-0.5">{item.label}</span>
              </Link>
            );
          })}

          {/* Bouton Plus — Comparaison pour Source+ */}
          {hasCompareAccess && (
            <button
              onClick={() => setPlusOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 h-16 min-w-[44px] transition-colors duration-200 ${
                pathname.startsWith("/compare")
                  ? "text-blue-700"
                  : "text-neutral-text-tertiary"
              }`}
              aria-label="Plus"
            >
              <IconDots size={22} />
              <span className="text-[10px] font-body mt-0.5">Plus</span>
            </button>
          )}
        </nav>
      </div>

      {/* ── Bottom Sheet "Plus" ──────────────────────────────────────────────── */}
      {plusOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setPlusOpen(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-white rounded-t-2xl pb-[env(safe-area-inset-bottom)] shadow-xl">
            {/* Handle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-border">
              <span className="text-ui font-body font-medium text-marine">Plus</span>
              <button
                onClick={() => setPlusOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-bg text-neutral-text-tertiary"
                aria-label="Fermer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-4">
              <Link
                href="/compare"
                onClick={() => setPlusOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors duration-100 ${
                  pathname.startsWith("/compare")
                    ? "bg-blue-50 text-blue-700"
                    : "text-marine hover:bg-neutral-bg"
                }`}
              >
                <IconLayoutColumns size={22} />
                <div>
                  <p className="text-ui font-body font-medium">Mode Comparaison</p>
                  <p className="text-caption font-body text-neutral-text-secondary">
                    Comparez plusieurs LLM côte à côte
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
