"use client";

import { useState } from "react";
import { IconArrowRight, IconDroplet } from "@tabler/icons-react";

export default function CTABanner() {
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
        padding: "96px 24px",
        background: "linear-gradient(135deg, #0B1F3A 0%, #1565C0 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Décoration */}
      <div
        style={{
          position: "absolute",
          top: -150,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative" }}>
        {/* Icône */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "0.5px solid rgba(255,255,255,0.2)",
            marginBottom: 24,
          }}
        >
          <IconDroplet size={28} color="#fff" />
        </div>

        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(28px, 5vw, 48px)",
            color: "#fff",
            margin: "0 0 16px",
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
          }}
        >
          Rejoignez la liste d&apos;attente.
          <br />
          <span style={{ opacity: 0.75 }}>Soyez parmi les premiers.</span>
        </h2>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: "rgba(255,255,255,0.7)",
            margin: "0 0 36px",
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          Accès anticipé, tarifs de lancement, et 14 jours offerts
          pour les 500 premiers inscrits qui activent un plan payant.
        </p>

        {submitted ? (
          <div
            style={{
              padding: "16px 24px",
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "0.5px solid rgba(255,255,255,0.2)",
            }}
          >
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#fff", fontWeight: 500, margin: 0, fontSize: 15 }}>
              ✓ Parfait ! Vous serez notifié à l&apos;ouverture.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: 8,
              maxWidth: 440,
              margin: "0 auto",
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              style={{
                flex: 1,
                padding: "13px 16px",
                borderRadius: 8,
                border: "0.5px solid rgba(255,255,255,0.2)",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                color: "#fff",
                outline: "none",
                backgroundColor: "rgba(255,255,255,0.08)",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.5)";
                e.target.style.backgroundColor = "rgba(255,255,255,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.2)";
                e.target.style.backgroundColor = "rgba(255,255,255,0.08)";
              }}
            />
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "13px 20px",
                borderRadius: 8,
                backgroundColor: "#fff",
                color: "#1565C0",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EBF1FB")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
            >
              Rejoindre <IconArrowRight size={16} />
            </button>
          </form>
        )}

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginTop: 14,
          }}
        >
          Gratuit · Aucun spam · Résiliable à tout moment
        </p>
      </div>
    </section>
  );
}
