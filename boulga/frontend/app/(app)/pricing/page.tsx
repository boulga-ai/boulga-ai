"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconSparkles,
  IconBrandWhatsapp,
  IconLayoutColumns,
  IconWand,
  IconRobot,
  IconUsers,
  IconInfinity,
} from "@tabler/icons-react";
import { initiatePayment } from "@/lib/api";

// ── Données ──────────────────────────────────────────────────────────────────

type BillingCycle = "monthly" | "annual";

interface Plan {
  key:          string;
  label:        string;
  popular?:     boolean;
  monthlyPrice: number | null; // null = gratuit
  annualPrice:  number | null;
  annualSaving: number;
  messages:     string;
  models:       string;
  files:        string;
  compare:      boolean;
  routing:      boolean;
  whatsapp:     boolean;
  history:      string;
  seats:        string;
  agents:       string | null;
  cta:          string;
  ctaVariant:   "primary" | "secondary" | "outline";
}

const PLANS: Plan[] = [
  {
    key:          "free",
    label:        "Gratuit",
    monthlyPrice: null,
    annualPrice:  null,
    annualSaving: 0,
    messages:     "10 messages / jour",
    models:       "Gemini Flash uniquement",
    files:        "Non inclus",
    compare:      false,
    routing:      false,
    whatsapp:     false,
    history:      "7 jours",
    seats:        "1 siège",
    agents:       null,
    cta:          "Commencer gratuitement",
    ctaVariant:   "outline",
  },
  {
    key:          "goutte",
    label:        "Goutte",
    monthlyPrice: 2_999,
    annualPrice:  29_990,
    annualSaving: 2_999 * 12 - 29_990,
    messages:     "600 messages / mois",
    models:       "Gemini + DeepSeek (éco)",
    files:        "3 fichiers / mois",
    compare:      false,
    routing:      false,
    whatsapp:     false,
    history:      "3 mois",
    seats:        "1 siège",
    agents:       null,
    cta:          "Choisir Goutte",
    ctaVariant:   "outline",
  },
  {
    key:          "source",
    label:        "Source",
    popular:      true,
    monthlyPrice: 5_999,
    annualPrice:  59_990,
    annualSaving: 5_999 * 12 - 59_990,
    messages:     "800 messages / mois",
    models:       "Tous les LLMs (éco + avancés)",
    files:        "20 fichiers / mois",
    compare:      true,
    routing:      true,
    whatsapp:     true,
    history:      "1 an",
    seats:        "1 siège",
    agents:       null,
    cta:          "Choisir Source",
    ctaVariant:   "primary",
  },
  {
    key:          "fleuve",
    label:        "Fleuve",
    monthlyPrice: 9_999,
    annualPrice:  99_990,
    annualSaving: 9_999 * 12 - 99_990,
    messages:     "2 000 messages / mois",
    models:       "Tous les LLMs (éco + avancés)",
    files:        "50 fichiers / mois",
    compare:      true,
    routing:      true,
    whatsapp:     true,
    history:      "Illimité",
    seats:        "1 siège",
    agents:       "2 agents au choix",
    cta:          "Choisir Fleuve",
    ctaVariant:   "outline",
  },
  {
    key:          "ocean",
    label:        "Océan",
    monthlyPrice: 29_999,
    annualPrice:  299_990,
    annualSaving: 29_999 * 12 - 299_990,
    messages:     "Illimité (cap 50M tokens)",
    models:       "Tous les LLMs (éco + avancés)",
    files:        "Illimité",
    compare:      true,
    routing:      true,
    whatsapp:     true,
    history:      "Illimité",
    seats:        "10 sièges",
    agents:       "8 agents + agents personnalisés",
    cta:          "Choisir Océan",
    ctaVariant:   "secondary",
  },
];

function formatFCFA(n: number): string {
  return n.toLocaleString("fr-FR") + " FCFA";
}

// ── Composant card ────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  cycle,
  onChoose,
  loading,
}: {
  plan:     Plan;
  cycle:    BillingCycle;
  onChoose: (key: string) => void;
  loading:  string | null;
}) {
  const price = cycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;

  const btnClass = {
    primary:   "bg-blue-700 text-neutral-white hover:bg-blue-900",
    secondary: "bg-marine text-neutral-white hover:bg-marine/90",
    outline:   "border border-neutral-border text-marine hover:bg-neutral-bg",
  }[plan.ctaVariant];

  return (
    <div
      className={`relative flex flex-col bg-neutral-white rounded-xl border overflow-hidden transition-shadow duration-200 hover:shadow-md ${
        plan.popular ? "border-blue-700 shadow-md" : "border-neutral-border"
      }`}
    >
      {plan.popular && (
        <div className="absolute top-0 left-0 right-0 py-1 bg-blue-700 text-center">
          <span className="text-[11px] font-body font-medium text-neutral-white tracking-wide uppercase">
            Populaire
          </span>
        </div>
      )}

      <div className={`px-6 ${plan.popular ? "pt-10 pb-6" : "pt-6 pb-6"}`}>
        {/* Nom */}
        <h3 className="text-h2 font-body font-medium text-marine mb-4">
          {plan.label}
        </h3>

        {/* Prix */}
        <div className="mb-2">
          {price === null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-display text-marine">0</span>
              <span className="text-ui font-body text-neutral-text-secondary">FCFA</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-display text-marine">
                {price.toLocaleString("fr-FR")}
              </span>
              <span className="text-ui font-body text-neutral-text-secondary">
                FCFA/{cycle === "monthly" ? "mois" : "an"}
              </span>
            </div>
          )}
        </div>

        {/* Économie annuelle */}
        {cycle === "annual" && plan.annualSaving > 0 && (
          <p className="text-caption font-body text-success mb-4">
            Économisez {formatFCFA(plan.annualSaving)} / an
          </p>
        )}
        {cycle === "monthly" && price !== null && (
          <p className="text-caption font-body text-neutral-text-tertiary mb-4">
            ou {formatFCFA(plan.annualPrice!)} / an (2 mois offerts)
          </p>
        )}
        {(cycle !== "annual" || plan.annualSaving === 0) && price === null && (
          <div className="mb-4" />
        )}

        {/* CTA */}
        {plan.key === "free" ? (
          <Link
            href="/auth/register"
            className={`block w-full py-2.5 text-center text-ui font-body font-medium rounded-lg transition-colors duration-100 ${btnClass}`}
          >
            {plan.cta}
          </Link>
        ) : (
          <button
            onClick={() => onChoose(plan.key)}
            disabled={loading === plan.key}
            className={`w-full py-2.5 text-ui font-body font-medium rounded-lg transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
          >
            {loading === plan.key ? "Redirection…" : plan.cta}
          </button>
        )}
      </div>

      {/* Caractéristiques */}
      <div className="px-6 pb-6 border-t border-neutral-border pt-4 flex-1">
        <ul className="space-y-2.5">
          <FeatureRow icon={<IconSparkles size={14} />} text={plan.messages} />
          <FeatureRow icon={<IconSparkles size={14} />} text={plan.models} />
          <FeatureRow icon={<IconSparkles size={14} />} text={`Fichiers : ${plan.files}`} />
          {plan.compare && <FeatureRow icon={<IconLayoutColumns size={14} />} text="Mode Comparaison" />}
          {plan.routing && <FeatureRow icon={<IconWand size={14} />} text="Routage Automatique" />}
          {plan.whatsapp && <FeatureRow icon={<IconBrandWhatsapp size={14} />} text="Bot WhatsApp" />}
          {plan.agents && <FeatureRow icon={<IconRobot size={14} />} text={plan.agents} />}
          <FeatureRow icon={<IconSparkles size={14} />} text={`Historique : ${plan.history}`} />
          <FeatureRow icon={<IconUsers size={14} />} text={plan.seats} />
          {plan.key === "ocean" && (
            <FeatureRow icon={<IconInfinity size={14} />} text="Accès API + tableau de bord admin" />
          )}
        </ul>
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex-shrink-0 mt-0.5 text-blue-700">{icon}</span>
      <span className="text-caption font-body text-neutral-text-secondary">{text}</span>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const router = useRouter();

  async function handleChoose(tier: string) {
    setError(null);
    setLoading(tier);
    try {
      const { payment_url } = await initiatePayment(tier, cycle);
      window.location.href = payment_url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création du paiement.",
      );
      setLoading(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-neutral-bg">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-display font-display text-marine mb-3">
            Choisissez votre plan
          </h1>
          <p className="text-body font-body text-neutral-text-secondary max-w-xl mx-auto">
            Accédez à tous les LLM depuis une seule interface. Payez en mobile
            money, en FCFA — sans carte internationale.
          </p>
        </div>

        {/* Toggle mensuel / annuel */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-ui font-body font-medium transition-colors duration-100 ${
              cycle === "monthly"
                ? "bg-blue-700 text-neutral-white"
                : "bg-neutral-white border border-neutral-border text-marine hover:bg-neutral-bg"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`px-5 py-2 rounded-full text-ui font-body font-medium transition-colors duration-100 ${
              cycle === "annual"
                ? "bg-blue-700 text-neutral-white"
                : "bg-neutral-white border border-neutral-border text-marine hover:bg-neutral-bg"
            }`}
          >
            Annuel
            <span className="ml-2 text-[10px] bg-success text-neutral-white px-1.5 py-0.5 rounded-full">
              2 mois offerts
            </span>
          </button>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 bg-red-50 border border-error rounded-lg text-caption font-body text-error text-center">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              cycle={cycle}
              onChoose={handleChoose}
              loading={loading}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-caption font-body text-neutral-text-tertiary mt-8">
          Paiement sécurisé via CinetPay (Mobile Money : Orange, Moov, MTN, Wave).
          Tous les prix sont en FCFA, TTC.
        </p>
      </div>
    </div>
  );
}
