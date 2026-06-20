"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

const FAQS = [
  {
    q: "Qu'est-ce que Boulga AI ?",
    a: "Boulga (« puits » en mooré) est une plateforme qui regroupe les grands modèles d'IA — Gemini, Claude, ChatGPT, DeepSeek — dans une seule interface. Vous payez en FCFA par mobile money, sans avoir besoin d'une carte bancaire internationale.",
  },
  {
    q: "Pourquoi payer Boulga si je peux accéder aux LLM directement ?",
    a: "Parce que chaque plateforme nécessite un compte séparé, une carte Visa internationale et souvent une interface en anglais. Avec Boulga, une seule inscription en français, un seul paiement en FCFA, et tous les LLM à portée de main. Le Mode Comparaison et le Routage Automatique vous font économiser du temps et vous donnent de meilleurs résultats.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Orange Money, Moov Money, Wave, et tous les opérateurs supportés par CinetPay dans la zone FCFA. Un mode de paiement international par Stripe sera également disponible pour les utilisateurs hors Afrique de l'Ouest.",
  },
  {
    q: "Quel LLM est disponible au lancement ?",
    a: "Gemini 2.5 Flash (modèle éco) et Gemini 2.5 Pro (modèle avancé) sont actifs dès le lancement. Claude, ChatGPT et DeepSeek seront ajoutés progressivement dans les semaines suivant l'ouverture.",
  },
  {
    q: "Qu'est-ce que le Mode Comparaison ?",
    a: "Vous envoyez un message unique et vous recevez en parallèle les réponses de plusieurs LLM côte à côte. Vous voyez concrètement les différences et choisissez la meilleure réponse. Disponible à partir du plan Source.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui. Vous pouvez monter ou descendre de plan à tout moment. Si vous montez, la différence de prix est calculée au prorata. Si vous descendez, votre accès au plan actuel est maintenu jusqu'à la fin de la période payée.",
  },
  {
    q: "Les agents métier du plan Océan, c'est quoi exactement ?",
    a: "Ce sont des assistants IA pré-configurés pour les réalités des entreprises d'Afrique de l'Ouest : Agent Comptable OHADA, Agent Facturation (devis et factures en FCFA), Agent RH, Agent Service Client, Agent Juridique, Agent Marketing, Agent Reporting et Agent Traducteur (Wolof, Dioula, Mooré).",
  },
  {
    q: "Mes données sont-elles confidentielles ?",
    a: "Oui. Vos conversations ne sont pas utilisées pour entraîner les modèles. Les données sont stockées de manière sécurisée sur Supabase (PostgreSQL) hébergé en Europe. Vous pouvez supprimer votre historique à tout moment.",
  },
  {
    q: "Existe-t-il une version mobile ?",
    a: "Boulga est une Progressive Web App (PWA) : vous pouvez l'installer sur votre Android ou iPhone directement depuis le navigateur, sans passer par le Play Store ou l'App Store. Elle fonctionne aussi en mode dégradé sur connexion lente.",
  },
  {
    q: "Comment fonctionne le parrainage ?",
    a: "Partagez votre lien unique. Quand un filleul souscrit à un plan payant, vous recevez automatiquement des jours ou mois gratuits selon son niveau. Plus le plan de votre filleul est élevé, plus votre récompense est généreuse. Il n'y a pas de limite au nombre de parrainages.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      style={{
        padding: "96px 24px",
        background: "linear-gradient(180deg, #F5F7FA 0%, #fff 100%)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
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
            FAQ
          </span>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "#0B1F3A",
              margin: "12px 0 0",
              letterSpacing: "-0.5px",
            }}
          >
            Vos questions, nos réponses.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                borderRadius: 12,
                border: "0.5px solid #E0E4EC",
                backgroundColor: "#fff",
                overflow: "hidden",
                transition: "box-shadow 0.15s",
                boxShadow: open === i ? "0 4px 16px rgba(11,31,58,0.06)" : "none",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 500,
                    color: open === i ? "#1565C0" : "#0B1F3A",
                    lineHeight: 1.4,
                    transition: "color 0.15s",
                  }}
                >
                  {faq.q}
                </span>
                <IconChevronDown
                  size={18}
                  style={{
                    color: open === i ? "#1565C0" : "#94A3B8",
                    flexShrink: 0,
                    transform: open === i ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s, color 0.15s",
                  }}
                />
              </button>

              {open === i && (
                <div
                  style={{
                    padding: "0 20px 18px",
                    borderTop: "0.5px solid #F0F3F7",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "#4A5568",
                      lineHeight: 1.7,
                      margin: "12px 0 0",
                      fontWeight: 300,
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
