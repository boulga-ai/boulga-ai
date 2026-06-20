"use client";

import { useState } from "react";
import {
  IconSparkles,
  IconArrowRight,
  IconBrandMeta,
  IconMessage,
  IconBolt,
} from "@tabler/icons-react";

const PROVIDERS = [
  { name: "Gemini", color: "#1565C0", bg: "#EBF1FB", active: true },
  { name: "Claude", color: "#0B1F3A", bg: "#E8ECF2", active: false },
  { name: "ChatGPT", color: "#2E7D32", bg: "#E8F5E9", active: false },
  { name: "DeepSeek", color: "#6B3FA0", bg: "#F0E8F8", active: false },
];

const DEMO_MESSAGES = [
  { role: "user", text: "Rédige un email professionnel pour relancer un client en retard de paiement" },
  {
    role: "assistant",
    provider: "Gemini",
    text: "Objet : Rappel — Facture n°2024-089 en attente de règlement\n\nBonjour M. Traoré,\n\nJ'espère que vous allez bien. Je me permets de vous contacter concernant la facture n°2024-089 d'un montant de 450 000 FCFA, dont l'échéance était fixée au 15 décembre. À ce jour, nous n'avons pas encore reçu le règlement...",
  },
];

export default function Hero() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "96px 24px 64px",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)",
      }}
    >
      {/* Décoration fond */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(21,101,192,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(11,31,58,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1140, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }}>
        {/* Badge */}
        <div
          className="fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 24,
            background: "#EBF1FB",
            border: "0.5px solid #BBCFEF",
            fontSize: 12,
            fontWeight: 500,
            color: "#1565C0",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: "#1565C0",
            }}
            className="pulse-dot"
          />
          Bêta en cours · Accès anticipé disponible
        </div>

        {/* Titre */}
        <div style={{ textAlign: "center", maxWidth: 780 }}>
          <h1
            className="fade-up fade-up-1"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(36px, 6vw, 64px)",
              lineHeight: 1.1,
              color: "#0B1F3A",
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            Claude, ChatGPT, Gemini, DeepSeek.{" "}
            <span className="shimmer">Un seul abonnement.</span>
          </h1>
          <p
            className="fade-up fade-up-2"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#4A5568",
              marginTop: 20,
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Les meilleures IA du monde réunies en une seule interface.
            Accédez à toutes sans jongler entre plusieurs comptes et abonnements —
            payez en <strong style={{ fontWeight: 500, color: "#0B1F3A" }}>CFA</strong>, simplement.
          </p>
        </div>

        {/* Formulaire waitlist */}
        <div className="fade-up fade-up-3" id="waitlist" style={{ width: "100%", maxWidth: 480 }}>
          {submitted ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 24px",
                borderRadius: 12,
                background: "#E8F5E9",
                border: "0.5px solid #A5D6A7",
              }}
            >
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#2E7D32", fontWeight: 500, margin: 0 }}>
                ✓ Vous êtes sur la liste ! On vous prévient à l&apos;ouverture.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "0.5px solid #E0E4EC",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#0B1F3A",
                  outline: "none",
                  backgroundColor: "#fff",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                onBlur={(e) => (e.target.style.borderColor = "#E0E4EC")}
              />
              <button
                type="submit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 20px",
                  borderRadius: 8,
                  backgroundColor: "#1565C0",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D47A1")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1565C0")}
              >
                Rejoindre <IconArrowRight size={16} />
              </button>
            </form>
          )}
          <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 10, fontFamily: "'DM Sans', sans-serif" }}>
            Accès anticipé gratuit · Aucun spam · Lancement Q3 2026
          </p>
        </div>

        {/* Stats */}
        <div
          className="fade-up fade-up-4"
          style={{
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { icon: <IconSparkles size={16} />, label: "4 LLM intégrés" },
            { icon: <IconBrandMeta size={16} />, label: "Paiement en CFA" },
            { icon: <IconMessage size={16} />, label: "Interface en français" },
            { icon: <IconBolt size={16} />, label: "Sans carte internationale requise" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#4A5568",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span style={{ color: "#1565C0" }}>{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>

        {/* Demo chat UI */}
        <div
          className="fade-up fade-up-5 float"
          style={{
            width: "100%",
            maxWidth: 680,
            borderRadius: 16,
            border: "0.5px solid #E0E4EC",
            backgroundColor: "#fff",
            boxShadow: "0 20px 60px rgba(11,31,58,0.08), 0 4px 16px rgba(11,31,58,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Barre de fenêtre */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderBottom: "0.5px solid #E0E4EC",
              backgroundColor: "#F5F7FA",
            }}
          >
            {["#FF5F57", "#FFBD2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
            ))}
            {/* Sélecteur LLM */}
            <div style={{ marginLeft: 16, display: "flex", gap: 6 }}>
              {PROVIDERS.map((p) => (
                <span
                  key={p.name}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    backgroundColor: p.active ? p.bg : "transparent",
                    color: p.active ? p.color : "#94A3B8",
                    border: p.active ? `0.5px solid ${p.color}30` : "0.5px solid #E0E4EC",
                    cursor: "default",
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {DEMO_MESSAGES.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.role === "assistant" && (
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: 8, marginTop: 2,
                      background: "linear-gradient(135deg, #1565C0, #0B1F3A)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <IconSparkles size={14} color="#fff" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    backgroundColor: m.role === "user" ? "#0B1F3A" : "#F5F7FA",
                    color: m.role === "user" ? "#fff" : "#0B1F3A",
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {m.role === "assistant" && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#1565C0", display: "block", marginBottom: 4 }}>
                      {m.provider}
                    </span>
                  )}
                  {m.text}
                  {m.role === "assistant" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 14,
                        backgroundColor: "#1565C0",
                        marginLeft: 2,
                        borderRadius: 1,
                        verticalAlign: "middle",
                      }}
                      className="pulse-dot"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input fictif */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "0.5px solid #E0E4EC",
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "0.5px solid #E0E4EC",
                fontSize: 13,
                color: "#94A3B8",
                fontFamily: "'DM Sans', sans-serif",
                backgroundColor: "#F5F7FA",
              }}
            >
              Posez votre question…
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "#1565C0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "default",
              }}
            >
              <IconArrowRight size={16} color="#fff" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
