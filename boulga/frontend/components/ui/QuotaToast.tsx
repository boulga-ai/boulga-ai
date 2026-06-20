"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function QuotaToast() {
  const { showQuotaToast, setShowQuotaToast, messagesRemaining, messagesLimit } =
    useSubscriptionStore();

  // Auto-dismiss après 6 secondes
  useEffect(() => {
    if (!showQuotaToast) return;
    const t = setTimeout(() => setShowQuotaToast(false), 6000);
    return () => clearTimeout(t);
  }, [showQuotaToast, setShowQuotaToast]);

  if (!showQuotaToast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm mx-auto px-4">
      <div className="flex items-start gap-3 p-4 bg-neutral-white border border-warning rounded-xl shadow-lg">
        <IconAlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-ui font-body font-medium text-marine">
            Vous approchez de votre limite
          </p>
          <p className="text-caption font-body text-neutral-text-secondary mt-0.5">
            Il vous reste{" "}
            <span className="font-medium text-warning">{messagesRemaining}</span>
            /{messagesLimit} messages cette période.{" "}
            <Link href="/pricing" className="text-blue-700 hover:underline" onClick={() => setShowQuotaToast(false)}>
              Voir les offres
            </Link>
          </p>
        </div>
        <button
          onClick={() => setShowQuotaToast(false)}
          className="flex-shrink-0 text-neutral-text-tertiary hover:text-marine"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}
