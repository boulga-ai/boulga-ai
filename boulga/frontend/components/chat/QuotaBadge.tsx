"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertCircle } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const TIER_LABELS: Record<string, string> = {
  free:   "Gratuit",
  goutte: "Goutte",
  source: "Source",
  fleuve: "Fleuve",
  ocean:  "Océan",
};

export default function QuotaBadge() {
  const {
    tier,
    messagesRemaining,
    messagesLimit,
    loaded,
    loadSubscription,
    setShowQuotaToast,
    setShowQuotaModal,
  } = useSubscriptionStore();

  // Charger au montage
  useEffect(() => {
    if (!loaded) loadSubscription();
  }, [loaded, loadSubscription]);

  const pct = messagesLimit > 0 ? messagesRemaining / messagesLimit : 1;
  const isExhausted = loaded && messagesRemaining <= 0;
  const isWarning   = loaded && !isExhausted && pct <= 0.2;

  // Déclencher les états UI selon le quota
  useEffect(() => {
    if (!loaded) return;
    if (isExhausted) {
      setShowQuotaModal(true);
    } else if (isWarning) {
      setShowQuotaToast(true);
    }
  }, [loaded, isExhausted, isWarning, setShowQuotaModal, setShowQuotaToast]);

  if (!loaded) return null;

  const badgeColor = isExhausted
    ? "bg-red-50 border-error text-error"
    : isWarning
    ? "bg-orange-50 border-warning text-warning"
    : "bg-neutral-bg border-neutral-border text-neutral-text-secondary";

  const label = TIER_LABELS[tier] ?? tier;

  // Océan — affichage simplifié (pas de limite messages)
  if (tier === "ocean") {
    return (
      <div className="flex items-center justify-end px-4 py-1.5 border-b border-neutral-border bg-neutral-white">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-body bg-marine border-marine text-neutral-white">
          {label} · Illimité
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end px-4 py-1.5 border-b border-neutral-border bg-neutral-white gap-2">
      {isExhausted && (
        <Link
          href="/pricing"
          className="text-[11px] font-body text-error hover:underline flex items-center gap-1"
        >
          <IconAlertCircle size={12} />
          Quota épuisé — Voir les offres
        </Link>
      )}
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-body ${badgeColor}`}
      >
        {label} · {messagesRemaining} msg restants
      </span>
    </div>
  );
}
