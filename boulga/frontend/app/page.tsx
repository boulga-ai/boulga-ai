"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconMenu2,
  IconX,
  IconCheck,
  IconBrandWhatsapp,
  IconLanguage,
  IconDeviceMobile,
  IconLayoutColumns,
  IconFileSearch,
  IconBrain,
  IconPencil,
  IconCode,
  IconChevronRight,
} from "@tabler/icons-react";

/* ─── Plans data ─────────────────────────────────────────── */

type Plan = {
  id: string;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualTotalPrice: number;
  savings: number;
  popular: boolean;
  features: string[];
  agents?: string[];
  cta: string;
  ctaHref: string | null;
  ctaPrimary: boolean;
};

const PLANS: Plan[] = [
  {
    id: "gratuit",
    name: "Gratuit",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    annualTotalPrice: 0,
    savings: 0,
    popular: false,
    features: [
      "10 messages / jour",
      "Gemini Flash uniquement",
      "Modèle économique",
      "Historique 7 jours",
      "1 siège",
    ],
    cta: "Commencer gratuitement",
    ctaHref: "/auth/register",
    ctaPrimary: true,
  },
  {
    id: "goutte",
    name: "Goutte",
    monthlyPrice: 2999,
    annualMonthlyPrice: 2499,
    annualTotalPrice: 29990,
    savings: 5998,
    popular: false,
    features: [
      "600 messages / mois",
      "Gemini + DeepSeek",
      "Modèle économique",
      "3 fichiers / mois",
      "Historique 3 mois",
      "1 siège",
    ],
    cta: "Choisir ce plan",
    ctaHref: null,
    ctaPrimary: false,
  },
  {
    id: "source",
    name: "Source",
    monthlyPrice: 5999,
    annualMonthlyPrice: 4999,
    annualTotalPrice: 59990,
    savings: 11998,
    popular: true,
    features: [
      "800 messages / mois",
      "Tous les LLM (Gemini, Claude, ChatGPT, DeepSeek)",
      "Modèles éco + avancés",
      "Mode Comparaison",
      "Bot WhatsApp inclus",
      "20 fichiers / mois",
      "Historique 1 an",
      "1 siège",
    ],
    cta: "Choisir ce plan",
    ctaHref: null,
    ctaPrimary: true,
  },
  {
    id: "fleuve",
    name: "Fleuve",
    monthlyPrice: 9999,
    annualMonthlyPrice: 8332,
    annualTotalPrice: 99990,
    savings: 19998,
    popular: false,
    features: [
      "2 000 messages / mois",
      "Tous les LLM + tous modèles",
      "2 agents métier au choix",
      "50 fichiers / mois",
      "Historique illimité",
      "1 siège",
    ],
    cta: "Choisir ce plan",
    ctaHref: null,
    ctaPrimary: false,
  },
  {
    id: "ocean",
    name: "Océan",
    monthlyPrice: 29999,
    annualMonthlyPrice: 24999,
    annualTotalPrice: 299990,
    savings: 59998,
    popular: false,
    features: [
      "Messages illimités (fair use 50M tokens/mois)",
      "Tous les LLM + tous modèles avancés",
      "10 sièges inclus",
      "Accès API",
      "Tableau de bord admin",
      "Fichiers illimités",
      "Historique illimité",
      "Support prioritaire < 24h",
      "8 agents métier inclus :",
    ],
    agents: [
      "Service client",
      "Comptabilité OHADA",
      "Facturation FCFA",
      "Ressources humaines",
      "Marketing",
      "Reporting",
      "Juridique",
      "Traduction",
    ],
    cta: "Choisir ce plan",
    ctaHref: null,
    ctaPrimary: false,
  },
];

/* ─── LLM data ────────────────────────────────────────────── */

const LLMS = [
  {
    id: "gemini",
    name: "Gemini",
    provider: "Google",
    icon: IconFileSearch,
    iconColor: "text-[#1A73E8]",
    iconBg: "bg-[#E8F0FE]",
    description:
      "Analyse de fichiers longs, PDF et recherche documentaire. Idéal pour synthétiser de grandes quantités d'informations.",
    active: true,
  },
  {
    id: "claude",
    name: "Claude",
    provider: "Anthropic",
    icon: IconBrain,
    iconColor: "text-[#8B5CF6]",
    iconBg: "bg-[#F3E8FF]",
    description:
      "Raisonnement structuré, analyse juridique et textes complexes. Reconnu pour sa précision et ses réponses nuancées.",
    active: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    provider: "OpenAI",
    icon: IconPencil,
    iconColor: "text-[#10A37F]",
    iconBg: "bg-[#E8F5F2]",
    description:
      "Créativité, rédaction et brainstorming. Polyvalent et performant sur une large variété de tâches.",
    active: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "DeepSeek AI",
    icon: IconCode,
    iconColor: "text-[#1565C0]",
    iconBg: "bg-[#E3F2FD]",
    description:
      "Code, développement et débogage. Spécialisé dans la génération et l'analyse de code avec une grande rigueur technique.",
    active: true,
  },
];

/* ─── Helpers ─────────────────────────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString("fr-FR");
}

/* ─── Landing Page ────────────────────────────────────────── */

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-neutral-white font-body">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-neutral-white/95 backdrop-blur-sm border-b border-neutral-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-[22px] text-marine leading-none"
          >
            Boulga
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-ui text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            >
              Accueil
            </Link>
            <Link
              href="/pricing"
              className="text-ui text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            >
              Tarifs
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-ui font-body font-medium text-neutral-text-secondary hover:text-marine transition-colors duration-100 px-3 py-2"
            >
              Connexion
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center px-4 py-2 bg-blue-700 text-neutral-white text-ui font-body font-medium rounded-md hover:bg-blue-900 transition-colors duration-100"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            aria-label="Menu"
          >
            {menuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-neutral-white border-t border-neutral-border px-6 py-4 space-y-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block text-body text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            >
              Accueil
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="block text-body text-neutral-text-secondary hover:text-marine transition-colors duration-100"
            >
              Tarifs
            </Link>
            <div className="pt-2 border-t border-neutral-border space-y-3">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="block text-body text-neutral-text-secondary"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center px-4 py-2 bg-blue-700 text-neutral-white text-body font-medium rounded-md"
              >
                Commencer gratuitement
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-marine text-neutral-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 lg:py-36">
          <div className="max-w-3xl">
            <h1 className="font-display leading-tight text-balance mb-6"
              style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
            >
              Puisez l'intelligence<br className="hidden sm:block" />
              qu'il vous faut
            </h1>
            <p className="text-[17px] font-body text-neutral-white/80 max-w-xl mb-10 leading-relaxed">
              Tous les grands modèles IA en une seule interface. Payez en mobile
              money, utilisez en français — sans barrière, sans complications.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-neutral-white text-body font-medium rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                Commencer gratuitement
                <IconChevronRight size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center px-6 py-3 border border-neutral-white/30 text-neutral-white text-body font-medium rounded-md hover:bg-neutral-white/10 transition-colors duration-200"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tous les LLM ───────────────────────────────────── */}
      <section className="bg-neutral-bg py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-h1 text-marine mb-3">
              Tous les LLM en un seul endroit
            </h2>
            <p className="text-body text-neutral-text-secondary max-w-xl mx-auto">
              Chaque modèle excelle dans son domaine. Boulga les rassemble pour
              que vous puissiez choisir — ou laisser l'IA choisir pour vous.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LLMS.map((llm) => {
              const Icon = llm.icon;
              return (
                <div
                  key={llm.id}
                  className={`bg-neutral-white border rounded-lg p-6 flex flex-col ${
                    llm.active
                      ? "border-blue-700 shadow-sm"
                      : "border-neutral-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg ${llm.iconBg} flex items-center justify-center`}>
                      <Icon size={20} className={llm.iconColor} />
                    </div>
                    {llm.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-caption font-medium rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-neutral-bg text-neutral-text-tertiary text-caption font-medium rounded-full border border-neutral-border">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <h3 className="text-h2 font-body font-medium text-marine mb-1">
                    {llm.name}
                  </h3>
                  <p className="text-caption font-body text-neutral-text-tertiary mb-3">
                    {llm.provider}
                  </p>
                  <p className="text-ui font-body text-neutral-text-secondary leading-relaxed flex-1">
                    {llm.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Mode Comparaison ───────────────────────────────── */}
      <section className="bg-neutral-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texte */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-caption font-medium rounded-full mb-4">
                <IconLayoutColumns size={14} />
                Fonctionnalité exclusive
              </div>
              <h2 className="font-display text-h1 text-marine mb-4 leading-tight">
                Voyez la différence<br /> en temps réel
              </h2>
              <p className="text-body text-neutral-text-secondary mb-8 leading-relaxed">
                Envoyez un message et recevez les réponses de plusieurs LLM côte à
                côte. Comparez les styles, la précision et les nuances pour choisir
                ce qui vous convient — à chaque fois.
              </p>
              <ul className="space-y-3">
                {[
                  "Réponses simultanées de tous vos LLM",
                  "Jusqu'à 4 modèles comparés côte à côte",
                  "Interface claire, colonnes sur desktop, onglets sur mobile",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconCheck size={12} className="text-blue-700" />
                    </div>
                    <span className="text-body text-neutral-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-blue-700 text-body font-medium hover:underline transition-colors duration-100"
                >
                  Disponible à partir du plan Source
                  <IconChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Visuel comparaison */}
            <div className="relative">
              <div className="bg-neutral-bg rounded-xl border border-neutral-border overflow-hidden shadow-sm">
                {/* Barre titre */}
                <div className="bg-neutral-white border-b border-neutral-border px-4 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-border" />
                  <div className="w-2 h-2 rounded-full bg-neutral-border" />
                  <div className="w-2 h-2 rounded-full bg-neutral-border" />
                  <span className="ml-2 text-caption font-body text-neutral-text-tertiary">
                    Mode Comparaison — Boulga
                  </span>
                </div>
                {/* Question utilisateur */}
                <div className="px-4 pt-4 pb-3">
                  <div className="bg-blue-700 text-neutral-white text-caption font-body px-3 py-2 rounded-lg ml-auto w-fit max-w-[70%]">
                    Explique-moi le droit OHADA en 3 points.
                  </div>
                </div>
                {/* Réponses côte à côte */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-neutral-border pb-4">
                  {/* Gemini */}
                  <div className="px-4 pt-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-4 h-4 rounded bg-[#E8F0FE] flex items-center justify-center">
                        <IconFileSearch size={10} className="text-[#1A73E8]" />
                      </div>
                      <span className="text-caption font-body font-medium text-[#1A73E8]">
                        Gemini Flash
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {[75, 100, 85, 60, 90, 70].map((w, i) => (
                        <div
                          key={i}
                          className="h-1.5 bg-neutral-border rounded-full"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="px-4 pt-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-4 h-4 rounded bg-[#F3E8FF] flex items-center justify-center">
                        <IconBrain size={10} className="text-[#8B5CF6]" />
                      </div>
                      <span className="text-caption font-body font-medium text-neutral-text-tertiary">
                        Claude Sonnet
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {[90, 70, 100, 55, 80, 65].map((w, i) => (
                        <div
                          key={i}
                          className="h-1.5 bg-neutral-border rounded-full"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Décoration */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full -z-10" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-neutral-bg rounded-full -z-10 border border-neutral-border" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Accessible partout ─────────────────────────────── */}
      <section className="bg-neutral-bg py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-h1 text-marine mb-3">
              Conçu pour l'Afrique de l'Ouest
            </h2>
            <p className="text-body text-neutral-text-secondary max-w-xl mx-auto">
              Boulga lève les barrières qui empêchaient d'accéder aux outils IA
              les plus puissants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: IconDeviceMobile,
                iconColor: "text-success",
                iconBg: "bg-success/10",
                title: "Paiement mobile money",
                description:
                  "Payez en FCFA avec Orange Money, Wave, CinetPay et plus. Pas besoin de carte bancaire internationale.",
              },
              {
                icon: IconLanguage,
                iconColor: "text-blue-700",
                iconBg: "bg-blue-50",
                title: "Interface en français",
                description:
                  "Navigation, aide et support entièrement en français. Les LLM répondent dans la langue que vous utilisez.",
              },
              {
                icon: IconBrandWhatsapp,
                iconColor: "text-[#25D366]",
                iconBg: "bg-[#E8FBF0]",
                title: "Langues locales et WhatsApp",
                description:
                  "Support du Wolof, Dioula, Mooré et Bambara. Utilisez Boulga directement depuis WhatsApp, sans app à installer.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-neutral-white border border-neutral-border rounded-lg p-6"
                >
                  <div
                    className={`w-12 h-12 rounded-lg ${item.iconBg} flex items-center justify-center mb-4`}
                  >
                    <Icon size={24} className={item.iconColor} />
                  </div>
                  <h3 className="text-h2 font-body font-medium text-marine mb-2">
                    {item.title}
                  </h3>
                  <p className="text-body text-neutral-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section className="bg-neutral-white py-20" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-h1 text-marine mb-3">
              Des offres pour chaque besoin
            </h2>
            <p className="text-body text-neutral-text-secondary max-w-md mx-auto mb-8">
              Commencez gratuitement. Évoluez selon vos besoins.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center bg-neutral-bg rounded-md border border-neutral-border p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 text-ui font-body font-medium rounded transition-colors duration-100 ${
                  billing === "monthly"
                    ? "bg-neutral-white text-marine shadow-sm"
                    : "text-neutral-text-secondary hover:text-marine"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-4 py-2 text-ui font-body font-medium rounded transition-colors duration-100 flex items-center gap-2 ${
                  billing === "annual"
                    ? "bg-neutral-white text-marine shadow-sm"
                    : "text-neutral-text-secondary hover:text-marine"
                }`}
              >
                Annuel
                <span className="text-success text-caption">2 mois offerts</span>
              </button>
            </div>
          </div>

          {/* Cards — horizontal scroll on mobile */}
          <div className="flex gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-5 xl:overflow-visible">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-neutral-white rounded-lg border flex-shrink-0 w-64 xl:w-auto flex flex-col overflow-hidden ${
                  plan.popular
                    ? "border-blue-700 ring-2 ring-blue-700"
                    : "border-neutral-border"
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-700 text-neutral-white text-center text-caption font-body font-medium py-1.5">
                    ⭐ Populaire
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  {/* Prix */}
                  <div className="mb-5">
                    <h3 className="text-h2 font-body font-medium text-marine mb-3">
                      {plan.name}
                    </h3>
                    {plan.monthlyPrice === 0 ? (
                      <div>
                        <span className="font-display text-[28px] text-marine leading-none">
                          Gratuit
                        </span>
                        <p className="text-caption font-body text-neutral-text-tertiary mt-1">
                          Pour toujours
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-end gap-1">
                          <span className="font-display text-[24px] text-marine leading-none">
                            {fmt(
                              billing === "monthly"
                                ? plan.monthlyPrice
                                : plan.annualMonthlyPrice
                            )}
                          </span>
                          <span className="text-caption font-body text-neutral-text-secondary mb-0.5">
                            FCFA/mois
                          </span>
                        </div>
                        {billing === "annual" && (
                          <>
                            <p className="text-caption font-body text-neutral-text-tertiary mt-0.5">
                              Facturé {fmt(plan.annualTotalPrice)} FCFA/an
                            </p>
                            <p className="text-caption font-body text-success mt-0.5">
                              Économisez {fmt(plan.savings)} FCFA
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <IconCheck
                          size={14}
                          className="text-success flex-shrink-0 mt-0.5"
                        />
                        <span className="text-caption font-body text-neutral-text-secondary">
                          {f}
                        </span>
                      </li>
                    ))}
                    {plan.agents && (
                      <li className="pl-4">
                        <p className="text-caption font-body text-neutral-text-tertiary">
                          {plan.agents.join(" · ")}
                        </p>
                      </li>
                    )}
                  </ul>

                  {/* CTA */}
                  {plan.ctaHref ? (
                    <Link
                      href={plan.ctaHref}
                      className={`block w-full text-center py-2 text-ui font-body font-medium rounded-md transition-colors duration-100 ${
                        plan.ctaPrimary
                          ? "bg-blue-700 text-neutral-white hover:bg-blue-900"
                          : "border border-neutral-border text-marine hover:bg-neutral-bg"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      className={`w-full py-2 text-ui font-body font-medium rounded-md transition-colors duration-100 ${
                        plan.ctaPrimary
                          ? "bg-blue-700 text-neutral-white hover:bg-blue-900"
                          : "border border-neutral-border text-marine hover:bg-neutral-bg"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link
              href="/pricing"
              className="text-blue-700 text-ui font-body hover:underline inline-flex items-center gap-1"
            >
              Voir tous les détails des offres
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Newsletter ─────────────────────────────────────── */}
      <section className="bg-marine py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="font-display text-h1 text-neutral-white mb-3">
            Soyez les premiers informés
          </h2>
          <p className="text-body text-neutral-white/70 max-w-md mx-auto mb-8">
            Boulga évolue constamment — soyez les premiers informés.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEmail("");
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre email"
              required
              className="flex-1 h-11 px-4 rounded-md border border-neutral-white/20 bg-neutral-white/10 text-neutral-white placeholder-neutral-white/40 text-body font-body focus:outline-none focus:border-neutral-white/40 transition-colors duration-100"
            />
            <button
              type="submit"
              className="h-11 px-6 bg-blue-700 text-neutral-white text-body font-body font-medium rounded-md hover:bg-blue-600 transition-colors duration-100 flex-shrink-0"
            >
              M'inscrire
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-marine border-t border-neutral-white/10 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Logo */}
            <div>
              <span className="font-display text-[20px] text-neutral-white leading-none">
                boulga.ai
              </span>
              <p className="text-caption font-body text-neutral-white/40 mt-1">
                Hub LLM unifié pour l'Afrique de l'Ouest
              </p>
            </div>

            {/* Liens */}
            <nav className="flex flex-wrap gap-6 justify-center md:justify-end">
              {[
                { label: "Accueil", href: "/" },
                { label: "Tarifs", href: "/pricing" },
                { label: "Contact", href: "mailto:contact@boulga.ai" },
                { label: "Mentions légales", href: "/legal" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-caption font-body text-neutral-white/50 hover:text-neutral-white/80 transition-colors duration-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-white/10">
            <p className="text-caption font-body text-neutral-white/30 text-center">
              © 2026 boulga.ai. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
