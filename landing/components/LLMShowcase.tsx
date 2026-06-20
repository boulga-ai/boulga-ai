"use client";

import { IconSparkles, IconCode, IconBrain, IconPencil, IconFileSearch } from "@tabler/icons-react";

const LLMS = [
  {
    name: "Gemini 2.5",
    provider: "Google",
    color: "#1565C0",
    bg: "linear-gradient(135deg, #EBF1FB 0%, #DDEEFF 100%)",
    border: "#BBCFEF",
    tag: "Actif au lancement",
    tagColor: "#1565C0",
    tagBg: "#EBF1FB",
    models: ["Gemini Flash — Éco", "Gemini Pro — Avancé"],
    strengths: [
      { icon: <IconFileSearch size={14} />, text: "Fenêtre de contexte 1M tokens" },
      { icon: <IconSparkles size={14} />, text: "Analyse de PDF & images" },
      { icon: <IconBrain size={14} />, text: "Recherche et synthèse" },
    ],
    quote: "\"Idéal pour résumer de longs documents et la recherche d'informations.\"",
  },
  {
    name: "Claude Sonnet",
    provider: "Anthropic",
    color: "#0B1F3A",
    bg: "linear-gradient(135deg, #E8ECF2 0%, #DCE3EF 100%)",
    border: "#BEC8D8",
    tag: "Bientôt disponible",
    tagColor: "#94A3B8",
    tagBg: "#F1F5F9",
    models: ["Claude Haiku — Éco", "Claude Sonnet — Avancé"],
    strengths: [
      { icon: <IconBrain size={14} />, text: "Raisonnement & analyse" },
      { icon: <IconFileSearch size={14} />, text: "Juridique & conformité" },
      { icon: <IconSparkles size={14} />, text: "Rédaction longue forme" },
    ],
    quote: "\"Le meilleur pour les tâches de raisonnement complexe et les analyses.\"",
  },
  {
    name: "ChatGPT 5.5",
    provider: "OpenAI",
    color: "#2E7D32",
    bg: "linear-gradient(135deg, #E8F5E9 0%, #D8EED9 100%)",
    border: "#A5D6A7",
    tag: "Bientôt disponible",
    tagColor: "#94A3B8",
    tagBg: "#F1F5F9",
    models: ["GPT Instant — Éco", "GPT Pro — Avancé"],
    strengths: [
      { icon: <IconPencil size={14} />, text: "Créativité & rédaction" },
      { icon: <IconSparkles size={14} />, text: "Marketing & copywriting" },
      { icon: <IconBrain size={14} />, text: "Brainstorming" },
    ],
    quote: "\"Le meilleur pour la création de contenu créatif et le marketing.\"",
  },
  {
    name: "DeepSeek V4",
    provider: "DeepSeek",
    color: "#6B3FA0",
    bg: "linear-gradient(135deg, #F0E8F8 0%, #E8DCF5 100%)",
    border: "#C5A8E2",
    tag: "Bientôt disponible",
    tagColor: "#94A3B8",
    tagBg: "#F1F5F9",
    models: ["DeepSeek Flash — Éco", "DeepSeek Pro — Avancé"],
    strengths: [
      { icon: <IconCode size={14} />, text: "Code & développement" },
      { icon: <IconBrain size={14} />, text: "Mathématiques avancées" },
      { icon: <IconSparkles size={14} />, text: "Raisonnement technique" },
    ],
    quote: "\"Le choix numéro un pour tout ce qui touche au code et aux maths.\"",
  },
];

export default function LLMShowcase() {
  return (
    <section
      style={{
        padding: "96px 24px",
        background: "linear-gradient(180deg, #F5F7FA 0%, #EEF2F7 100%)",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
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
            Les LLM intégrés
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
            Le meilleur de chaque LLM,
            <br />
            au même endroit.
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: "#4A5568",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Chaque IA a ses forces. Boulga vous donne accès à toutes.
            Choisissez ou laissez le routage automatique décider.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
          }}
        >
          {LLMS.map((llm) => (
            <div
              key={llm.name}
              style={{
                borderRadius: 16,
                border: `0.5px solid ${llm.border}`,
                background: llm.bg,
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(11,31,58,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: llm.color, fontWeight: 500, margin: 0, opacity: 0.7 }}>
                    {llm.provider}
                  </p>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#0B1F3A", margin: "4px 0 0" }}>
                    {llm.name}
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: llm.tagColor,
                    backgroundColor: llm.tagBg,
                    padding: "4px 8px",
                    borderRadius: 20,
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {llm.tag}
                </span>
              </div>

              {/* Modèles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {llm.models.map((m) => (
                  <div
                    key={m}
                    style={{
                      fontSize: 12,
                      color: llm.color,
                      fontFamily: "'DM Sans', sans-serif",
                      padding: "5px 10px",
                      borderRadius: 6,
                      backgroundColor: "rgba(255,255,255,0.6)",
                      border: `0.5px solid ${llm.border}`,
                      fontWeight: 400,
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>

              {/* Forces */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {llm.strengths.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: llm.color, flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, color: "#4A5568", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Citation */}
              <p
                style={{
                  fontSize: 12,
                  color: "#4A5568",
                  fontFamily: "'DM Sans', sans-serif",
                  fontStyle: "italic",
                  margin: 0,
                  paddingTop: 8,
                  borderTop: `0.5px solid ${llm.border}`,
                  lineHeight: 1.6,
                  fontWeight: 300,
                }}
              >
                {llm.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
