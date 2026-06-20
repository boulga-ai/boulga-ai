"use client";

import { useState, useEffect } from "react";
import { IconDroplet, IconMenu2, IconX } from "@tabler/icons-react";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 0.2s ease",
        backgroundColor: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "0.5px solid #E0E4EC" : "none",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 64, gap: 32 }}>
          {/* Logo */}
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #1565C0 0%, #0B1F3A 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconDroplet size={18} color="#fff" />
            </div>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#0B1F3A", letterSpacing: "-0.3px" }}>
              Boulga
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#1565C0", background: "#EBF1FB", padding: "2px 6px", borderRadius: 4 }}>
              AI
            </span>
          </a>

          {/* Nav links — desktop */}
          <nav style={{ display: "flex", gap: 32, marginLeft: "auto" }} className="hidden-mobile">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#4A5568",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0B1F3A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4A5568")}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA — desktop */}
          <div style={{ display: "flex", gap: 12, marginLeft: 32 }} className="hidden-mobile">
            <a
              href="#pricing"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#0B1F3A",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: 8,
                border: "0.5px solid #E0E4EC",
                transition: "background 0.15s",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F7FA")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Voir les plans
            </a>
            <a
              href="#waitlist"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: "#1565C0",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D47A1")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1565C0")}
            >
              Rejoindre la liste d&apos;attente
            </a>
          </div>

          {/* Burger — mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#0B1F3A",
              padding: 4,
            }}
            className="show-mobile"
            aria-label="Menu"
          >
            {menuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="show-mobile"
            style={{
              paddingBottom: 16,
              borderTop: "0.5px solid #E0E4EC",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#4A5568",
                  textDecoration: "none",
                  padding: "10px 8px",
                  borderRadius: 8,
                  transition: "background 0.1s",
                }}
              >
                {l.label}
              </a>
            ))}
            <a
              href="#waitlist"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: 8,
                backgroundColor: "#1565C0",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Rejoindre la liste d&apos;attente
            </a>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
