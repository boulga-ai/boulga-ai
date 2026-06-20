"use client";

import { IconDroplet, IconBrandTwitter, IconBrandLinkedin, IconBrandWhatsapp } from "@tabler/icons-react";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#0B1F3A",
        padding: "48px 24px 32px",
        color: "rgba(255,255,255,0.6)",
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {/* Top */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          {/* Marque */}
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #1565C0, rgba(255,255,255,0.1))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconDroplet size={16} color="#fff" />
              </div>
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 18,
                  color: "#fff",
                }}
              >
                Boulga AI
              </span>
            </div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.7,
                margin: 0,
                fontWeight: 300,
              }}
            >
              Tous les grands LLM en une seule interface.
              Paiement mobile money en FCFA.
              Pensé pour l&apos;Afrique de l&apos;Ouest.
            </p>
          </div>

          {/* Liens */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                  margin: "0 0 12px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Produit
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Fonctionnalités", "Tarifs", "FAQ"].map((l) => (
                  <a
                    key={l}
                    href={`#${l.toLowerCase()}`}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                      fontWeight: 300,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                  margin: "0 0 12px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Légal
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Conditions d'utilisation", "Politique de confidentialité", "Mentions légales"].map((l) => (
                  <a
                    key={l}
                    href="#"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                      fontWeight: 300,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            paddingTop: 24,
            borderTop: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              margin: 0,
              fontWeight: 300,
            }}
          >
            © 2026 Boulga AI. Tous droits réservés. Fait avec soin en Afrique de l&apos;Ouest.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            {[
              { icon: <IconBrandTwitter size={17} />, href: "#" },
              { icon: <IconBrandLinkedin size={17} />, href: "#" },
              { icon: <IconBrandWhatsapp size={17} />, href: "#" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
