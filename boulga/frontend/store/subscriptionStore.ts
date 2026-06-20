import { create } from "zustand";
import { getSubscription, type SubscriptionInfo } from "@/lib/api";
import { useToastStore } from "@/store/toastStore";
import type { Tier } from "@/types";

// ── État ──────────────────────────────────────────────────────────────────────

interface SubscriptionState {
  tier: Tier;
  billingCycle: string | null;
  messagesRemaining: number;
  messagesLimit: number;
  filesRemaining: number;
  tokensRemaining: number;
  periodEnd: string;
  loaded: boolean;

  // UI states
  showQuotaModal: boolean;
  showQuotaToast: boolean;
  showUpgradeModal: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

interface SubscriptionActions {
  loadSubscription: () => Promise<void>;
  setShowQuotaModal: (v: boolean) => void;
  setShowQuotaToast: (v: boolean) => void;
  setShowUpgradeModal: (v: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fromApi(s: SubscriptionInfo): Partial<SubscriptionState> {
  return {
    tier:              s.tier as Tier,
    billingCycle:      s.billing_cycle,
    messagesRemaining: s.messages_remaining,
    messagesLimit:     s.messages_limit,
    filesRemaining:    s.files_remaining,
    tokensRemaining:   s.tokens_remaining,
    periodEnd:         s.period_end,
    loaded:            true,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>(
  (set) => ({
    tier:              "free",
    billingCycle:      null,
    messagesRemaining: 10,
    messagesLimit:     10,
    filesRemaining:    0,
    tokensRemaining:   -1,
    periodEnd:         "",
    loaded:            false,
    showQuotaModal:    false,
    showQuotaToast:    false,
    showUpgradeModal:  false,

    loadSubscription: async () => {
      try {
        const data = await getSubscription();
        const prev = useToastStore.getState();
        set(fromApi(data));

        // Toast quota à 80% (uniquement si on est passé sous le seuil dans cet appel)
        const { messages_remaining, messages_limit } = data;
        if (messages_limit > 0) {
          const ratio = messages_remaining / messages_limit;
          if (ratio <= 0.2 && ratio > 0) {
            prev.addToast({
              type:    "warning",
              title:   "Vous approchez de votre limite",
              message: `Il vous reste ${messages_remaining} message${messages_remaining !== 1 ? "s" : ""} cette période.`,
            });
          }
        }
      } catch {
        // silencieux — on garde les valeurs initiales (free)
      }
    },

    setShowQuotaModal: (v) => set({ showQuotaModal: v }),
    setShowQuotaToast: (v) => set({ showQuotaToast: v }),
    setShowUpgradeModal: (v) => set({ showUpgradeModal: v }),
  }),
);
