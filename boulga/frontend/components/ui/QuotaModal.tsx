"use client";

import Link from "next/link";
import { IconRocket, IconX } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const TIER_LABELS: Record<string, string> = {
  free:   "Gratuit",
  goutte: "Goutte",
  source: "Source",
  fleuve: "Fleuve",
  ocean:  "Océan",
};

const NEXT_TIER: Record<string, string> = {
  free:   "Goutte",
  goutte: "Source",
  source: "Fleuve",
  fleuve: "Océan",
};

export default function QuotaModal() {
  const { showQuotaModal, setShowQuotaModal, tier, periodEnd } = useSubscriptionStore();

  if (!showQuotaModal) return null;

  const currentLabel = TIER_LABELS[tier] ?? tier;
  const nextLabel    = NEXT_TIER[tier] ?? "supérieur";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-marine/40 backdrop-blur-sm">
      <div className="relative bg-neutral-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        {/* Bouton fermer (secondaire — le CTA principal est l'upgrade) */}
        <button
          onClick={() => setShowQuotaModal(false)}
          className="absolute top-4 right-4 text-neutral-text-tertiary hover:text-marine transition-colors"
          aria-label="Fermer"
        >
          <IconX size={18} />
        </button>

        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <IconRocket size={28} className="text-error" />
        </div>

        <h2 className="text-h1 font-display text-marine mb-2">
          Quota épuisé
        </h2>

        <p className="text-body font-body text-neutral-text-secondary mb-1">
          Vous avez atteint la limite du plan{" "}
          <span className="font-medium text-marine">{currentLabel}</span>.
        </p>

        {periodEnd && (
          <p className="text-caption font-body text-neutral-text-tertiary mb-6">
            Votre quota se réinitialise le{" "}
            {new Date(periodEnd).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
            .
          </p>
        )}

        <Link
          href="/pricing"
          onClick={() => setShowQuotaModal(false)}
          className="block w-full py-3 px-6 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-lg hover:bg-blue-900 transition-colors duration-200 mb-3"
        >
          Passer au plan {nextLabel}
        </Link>

        <button
          onClick={() => setShowQuotaModal(false)}
          className="text-ui font-body text-neutral-text-tertiary hover:text-marine transition-colors"
        >
          Continuer avec le plan {currentLabel}
        </button>
      </div>
    </div>
  );
}
