"use client";

import Link from "next/link";
import { IconLock, IconX } from "@tabler/icons-react";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const NEXT_TIER: Record<string, string> = {
  free:   "Source",
  goutte: "Source",
  source: "Fleuve",
  fleuve: "Océan",
};

export default function UpgradeModal() {
  const { showUpgradeModal, setShowUpgradeModal, tier } = useSubscriptionStore();

  if (!showUpgradeModal) return null;

  const nextLabel = NEXT_TIER[tier] ?? "supérieur";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-marine/40 backdrop-blur-sm">
      <div className="relative bg-neutral-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        <button
          onClick={() => setShowUpgradeModal(false)}
          className="absolute top-4 right-4 text-neutral-text-tertiary hover:text-marine transition-colors"
          aria-label="Fermer"
        >
          <IconX size={18} />
        </button>

        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <IconLock size={28} className="text-blue-700" />
        </div>

        <h2 className="text-h1 font-display text-marine mb-2">
          Plan requis
        </h2>

        <p className="text-body font-body text-neutral-text-secondary mb-6">
          Ce modèle n'est pas disponible sur votre abonnement actuel.
          Passez au plan <span className="font-medium text-marine">{nextLabel}</span> pour y accéder.
        </p>

        <Link
          href="/pricing"
          onClick={() => setShowUpgradeModal(false)}
          className="block w-full py-3 px-6 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-lg hover:bg-blue-900 transition-colors duration-200 mb-3"
        >
          Voir les plans
        </Link>

        <button
          onClick={() => setShowUpgradeModal(false)}
          className="text-ui font-body text-neutral-text-tertiary hover:text-marine transition-colors"
        >
          Continuer avec mon plan actuel
        </button>
      </div>
    </div>
  );
}
