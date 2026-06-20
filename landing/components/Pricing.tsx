"use client";

import { useState } from "react";
import { IconCheck, IconMinus, IconStar } from "@tabler/icons-react";

const PLANS = [
  {
    name: "Gratuit",
    price_month: 0,
    price_year: 0,
    subtitle: "Pour découvrir Boulga",
    color: "#4A5568",
    bg: "#fff",
    border: "#E0E4EC",
    highlight: false,
    cta: "Commencer gratuitement",
    features: [
      { text: "10 messages / jour", ok: true },
      { text: "Gemini Flash uniquement", ok: true },
      { text: "Historique 7 jours", ok: true },
      { text: "Fichiers", ok: false },
      { text: "Mode Comparaison", ok: false },
      { text: "Bot WhatsApp", ok: false },
      { text: "Routage Automatique", ok: false },
    ],
  },
  {
    name: "Goutte",
    price_month: 2999,
    price_year: 29990,
    subtitle: "Pour l'étudiant et le primo-utilisateur",
    color: "#4A5568",
    bg: "#fff",
    border: "#E0E4EC",
    highlight: false,
    cta: "Choisir Goutte",
    features: [
      { text: "600 messages / mois", ok: true },
      { text: "Gemini + DeepSeek", ok: true },
      { text: "3 fichiers / mois", ok: true },
      { text: "Historique 3 mois", ok: true },
      { text: "Mode Comparaison", ok: false },
      { text: "Bot WhatsApp", ok: false },
      { text: "Routage Automatique", ok: false },
    ],
  },
  {
    name: "Source",
    price_month: 5999,
    price_year: 59990,
    subtitle: "Pour le freelance et le professionnel",
    color: "#1565C0",
    bg: "linear-gradient(160deg, #0B1F3A 0%, #1565C0 100%)",
    border: "#1565C0",
    highlight: true,
    cta: "Choisir Source",
    features: [
      { text: "800 messages / mois", ok: true },
      { text: "Tous les LLM (éco + avancés)", ok: true },
      { text: "20 fichiers / mois", ok: true },
      { text: "Mode Comparaison", ok: true },
      { text: "Routage Automatique", ok: true },
      { text: "Bot WhatsApp", ok: true },
      { text: "Historique 1 an", ok: true },
    ],
  },
  {
    name: "Fleuve",
    price_month: 9999,
    price_year: 99990,
    subtitle: "Pour le power user et la PME",
    color: "#4A5568",
    bg: "#fff",
    border: "#E0E4EC",
    highlight: false,
    cta: "Choisir Fleuve",
    features: [
      { text: "2 000 messages / mois", ok: true },
      { text: "Tous les LLM (éco + avancés)", ok: true },
      { text: "50 fichiers / mois", ok: true },
      { text: "Mode Comparaison", ok: true },
      { text: "Routage Automatique", ok: true },
      { text: "Bot WhatsApp", ok: true },
      { text: "2 agents métier inclus", ok: true },
    ],
  },
  {
    name: "Océan",
    price_month: 29999,
    price_year: 299990,
    subtitle: "Pour l'entreprise et les équipes",
    color: "#4A5568",
    bg: "#fff",
    border: "#E0E4EC",
    highlight: false,
    cta: "Contacter l'équipe",
    features: [
      { text: "Messages illimités (fair use 50M tokens)", ok: true },
      { text: "Tous les LLM (éco + avancés)", ok: true },
      { text: "Fichiers illimités", ok: true },
      { text: "8 agents métier OHADA inclus", ok: true },
      { text: "10 sièges + tableau de bord admin", ok: true },
      { text: "API access + agents personnalisés", ok: true },
      { text: "Support prioritaire < 24h", ok: true },
    ],
  },
];

function fmt(n: number) {
  if (n === 0) return "0";
  return n.toLocaleString("fr-FR");
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      style={{
        padding: "96px 24px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Titre */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "#1565C0",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Tarifs
          </span>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#0B1F3A",
              margin: "12px 0 16px",
              letterSpacing: "-0.5px",
            }}
          >
            Transparent. Accessible.
            <br />
            <span style={{ color: "#1565C0" }}>En FCFA.</span>
          </h2>

          {/* Toggle mensuel / annuel */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
              padding: "4px",
              borderRadius: 8,
              border: "0.5px solid #E0E4EC",
              backgroundColor: "#F5F7FA",
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                backgroundColor: !annual ? "#fff" : "transparent",
                color: !annual ? "#0B1F3A" : "#94A3B8",
                boxShadow: !annual ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                backgroundColor: annual ? "#fff" : "transparent",
                color: annual ? "#0B1F3A" : "#94A3B8",
                boxShadow: annual ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Annuel
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#2E7D32",
                  backgroundColor: "#E8F5E9",
                  padding: "2px 6px",
                  borderRadius: 10,
                }}
              >
                −2 mois
              </span>
            </button>
          </div>
        </div>

        {/* Grille */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {PLANS.map((plan) => {
            const price = annual ? plan.price_year : plan.price_month;
            const perMonth = annual && plan.price_year > 0
              ? Math.round(plan.price_year / 12)
              : plan.price_month;

            return (
              <div
                key={plan.name}
                style={{
                  borderRadius: 16,
                  border: plan.highlight ? "1.5px solid #1565C0" : "0.5px solid #E0E4EC",
                  background: plan.bg,
                  padding: "28px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: plan.highlight ? "0 20px 60px rgba(21,101,192,0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(11,31,58,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      borderRadius: 20,
                      backgroundColor: "#1565C0",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <IconStar size={11} fill="#fff" />
                    Le plus populaire
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: plan.highlight ? "rgba(255,255,255,0.7)" : "#94A3B8",
                      margin: "0 0 4px",
                    }}
                  >
                    {plan.name}
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span
                      style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: 28,
                        color: plan.highlight ? "#fff" : "#0B1F3A",
                      }}
                    >
                      {fmt(plan.price_month === 0 ? 0 : perMonth)}
                    </span>
                    {plan.price_month > 0 && (
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          color: plan.highlight ? "rgba(255,255,255,0.6)" : "#94A3B8",
                        }}
                      >
                        FCFA/mois
                      </span>
                    )}
                    {plan.price_month === 0 && (
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          color: plan.highlight ? "rgba(255,255,255,0.6)" : "#94A3B8",
                        }}
                      >
                        FCFA
                      </span>
                    )}
                  </div>
                  {annual && plan.price_year > 0 && (
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: plan.highlight ? "rgba(255,255,255,0.5)" : "#94A3B8",
                        margin: "2px 0 0",
                      }}
                    >
                      {fmt(price)} FCFA / an
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: plan.highlight ? "rgba(255,255,255,0.6)" : "#4A5568",
                      margin: "8px 0 0",
                      lineHeight: 1.5,
                      fontWeight: 300,
                    }}
                  >
                    {plan.subtitle}
                  </p>
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      {f.ok ? (
                        <IconCheck
                          size={14}
                          style={{
                            color: plan.highlight ? "#4FC3F7" : "#1565C0",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />
                      ) : (
                        <IconMinus
                          size={14}
                          style={{
                            color: plan.highlight ? "rgba(255,255,255,0.25)" : "#E0E4EC",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          color: f.ok
                            ? (plan.highlight ? "rgba(255,255,255,0.9)" : "#0B1F3A")
                            : (plan.highlight ? "rgba(255,255,255,0.3)" : "#C4C9D4"),
                          lineHeight: 1.5,
                          fontWeight: 300,
                        }}
                      >
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href="#waitlist"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    textDecoration: "none",
                    backgroundColor: plan.highlight ? "#fff" : "transparent",
                    color: plan.highlight ? "#1565C0" : "#0B1F3A",
                    border: plan.highlight ? "none" : "0.5px solid #E0E4EC",
                    transition: "all 0.15s",
                    marginTop: "auto",
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      e.currentTarget.style.backgroundColor = "#EBF1FB";
                    } else {
                      e.currentTarget.style.backgroundColor = "#F5F7FA";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) {
                      e.currentTarget.style.backgroundColor = "#fff";
                    } else {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            );
          })}
        </div>

        {/* Note mobile money */}
        <div
          style={{
            marginTop: 40,
            padding: "16px 24px",
            borderRadius: 12,
            backgroundColor: "#F5F7FA",
            border: "0.5px solid #E0E4EC",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 20 }}>📱</span>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#4A5568",
              margin: 0,
              fontWeight: 300,
            }}
          >
            Paiement accepté via{" "}
            <strong style={{ fontWeight: 500, color: "#0B1F3A" }}>Orange Money, Moov Money, Wave</strong>
            {" "}et autres opérateurs locaux —{" "}
            <strong style={{ fontWeight: 500, color: "#0B1F3A" }}>sans carte bancaire internationale</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}
