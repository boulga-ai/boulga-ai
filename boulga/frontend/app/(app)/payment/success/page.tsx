"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconCheck, IconX, IconLoader } from "@tabler/icons-react";
import { checkPaymentStatus } from "@/lib/api";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useToastStore } from "@/store/toastStore";

type Status = "loading" | "success" | "failed" | "not_found";

const TIER_LABELS: Record<string, string> = {
  goutte: "Goutte",
  source: "Source",
  fleuve: "Fleuve",
  ocean:  "Océan",
};

function PaymentSuccessContent() {
  const params = useSearchParams();
  const txn    = params.get("txn") ?? "";

  const [status, setStatus]     = useState<Status>("loading");
  const [tier, setTier]         = useState<string>("");
  const [attempts, setAttempts] = useState(0);

  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);

  useEffect(() => {
    if (!txn) {
      setStatus("not_found");
      return;
    }

    let mounted = true;

    async function poll() {
      try {
        const res = await checkPaymentStatus(txn);
        if (!mounted) return;

        if (res.status === "completed") {
          const resolvedTier = res.tier ?? "";
          setTier(resolvedTier);
          setStatus("success");
          loadSubscription();
          useToastStore.getState().addToast({
            type:  "success",
            title: `Abonnement ${TIER_LABELS[resolvedTier] ?? resolvedTier} activé !`,
            message: "Profitez de tous vos avantages.",
          });
        } else if (res.status === "not_found") {
          setStatus("not_found");
        } else if (attempts < 8) {
          setTimeout(() => {
            if (mounted) setAttempts((n) => n + 1);
          }, 2000);
        } else {
          setStatus("failed");
        }
      } catch {
        if (mounted && attempts < 3) {
          setTimeout(() => {
            if (mounted) setAttempts((n) => n + 1);
          }, 2000);
        } else if (mounted) {
          setStatus("failed");
        }
      }
    }

    poll();

    return () => {
      mounted = false;
    };
  }, [txn, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full overflow-y-auto bg-neutral-bg flex items-center justify-center">
      <div className="bg-neutral-white rounded-2xl border border-neutral-border shadow-sm w-full max-w-sm mx-4 p-10 text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-full bg-neutral-bg flex items-center justify-center mx-auto mb-6">
              <IconLoader size={32} className="text-blue-700 animate-spin" />
            </div>
            <h2 className="text-h1 font-display text-marine mb-2">
              Vérification en cours…
            </h2>
            <p className="text-body font-body text-neutral-text-secondary">
              Nous confirmons votre paiement avec CinetPay.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <IconCheck size={32} className="text-success" />
            </div>
            <h2 className="text-h1 font-display text-marine mb-2">
              Paiement confirmé !
            </h2>
            <p className="text-body font-body text-neutral-text-secondary mb-6">
              Votre abonnement{" "}
              <span className="font-medium text-marine">
                {TIER_LABELS[tier] ?? tier}
              </span>{" "}
              est maintenant actif. Bienvenue sur Boulga !
            </p>
            <Link
              href="/chat"
              className="block w-full py-3 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-lg hover:bg-blue-900 transition-colors duration-100"
            >
              Commencer à utiliser Boulga
            </Link>
          </>
        )}

        {(status === "failed" || status === "not_found") && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <IconX size={32} className="text-error" />
            </div>
            <h2 className="text-h1 font-display text-marine mb-2">
              {status === "not_found" ? "Transaction introuvable" : "Paiement non confirmé"}
            </h2>
            <p className="text-body font-body text-neutral-text-secondary mb-6">
              {status === "not_found"
                ? "Aucune transaction correspondante n'a été trouvée."
                : "Le paiement n'a pas été confirmé. Si vous avez été débité, contactez notre support."}
            </p>
            <Link
              href="/pricing"
              className="block w-full py-3 border border-neutral-border text-marine text-ui font-body font-medium rounded-lg hover:bg-neutral-bg transition-colors duration-100"
            >
              Réessayer
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center bg-neutral-bg">
        <IconLoader size={32} className="text-blue-700 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
