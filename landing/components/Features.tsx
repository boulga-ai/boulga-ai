"use client";

import {
  IconLayoutColumns,
  IconRoute,
  IconBrandWhatsapp,
  IconLanguage,
  IconDeviceMobile,
  IconShieldCheck,
  IconHistory,
  IconFileText,
} from "@tabler/icons-react";

const FEATURES = [
  {
    icon: <IconLayoutColumns size={22} />,
    title: "Mode Comparaison",
    desc: "Envoyez un message et voyez les réponses de Gemini, Claude, ChatGPT et DeepSeek côte à côte. Choisissez la meilleure réponse selon votre besoin.",
    badge: "Plan Source+",
    color: "#1565C0",
    bg: "#EBF1FB",
  },
  {
    icon: <IconRoute size={22} />,
    title: "Routage Automatique",
    desc: "Boulga analyse votre question et choisit le LLM le plus adapté : DeepSeek pour le code, Claude pour le raisonnement, Gemini pour les longs documents.",
    badge: "Plan Source+",
    color: "#1565C0",
    bg: "#EBF1FB",
  },
  {
    icon: <IconBrandWhatsapp size={22} />,
    title: "Bot WhatsApp",
    desc: "Chattez avec les LLM directement depuis WhatsApp. Aucune app à installer, aucun compte supplémentaire. Parfait pour rester mobile.",
    badge: "Plan Source+",
    color: "#2E7D32",
    bg: "#E8F5E9",
  },
  {
    icon: <IconLanguage size={22} />,
    title: "Support multilingue",
    desc: "Interface en français. Les LLM répondent dans la langue de votre choix : français, anglais, et de nombreuses autres langues selon le modèle.",
    badge: "Tous les plans",
    color: "#0B1F3A",
    bg: "#E8ECF2",
  },
  {
    icon: <IconDeviceMobile size={22} />,
    title: "Progressive Web App",
    desc: "Installez Boulga sur votre Android ou iOS sans passer par les stores. Fonctionne même sur connexion lente grâce au mode dégradé.",
    badge: "Tous les plans",
    color: "#0B1F3A",
    bg: "#E8ECF2",
  },
  {
    icon: <IconFileText size={22} />,
    title: "Génération de fichiers",
    desc: "Demandez à Boulga de créer un fichier Word, Excel ou PDF. Le LLM génère directement le document, téléchargeable en un clic depuis votre panneau.",
    badge: "Plan Source+",
    color: "#1565C0",
    bg: "#EBF1FB",
  },
  {
    icon: <IconHistory size={22} />,
    title: "Historique illimité",
    desc: "Retrouvez toutes vos conversations passées, filtrez par date ou par LLM. L'historique est conservé de 7 jours (Gratuit) à illimité (Fleuve+).",
    badge: "Tous les plans",
    color: "#0B1F3A",
    bg: "#E8ECF2",
  },
  {
    icon: <IconShieldCheck size={22} />,
    title: "Paiement simplifié en CFA",
    desc: "Orange Money, Moov Money, Wave — payez en CFA sans carte internationale ni compte étranger. Un abonnement, toutes les IA.",
    badge: "Exclusivité Boulga",
    color: "#F57C00",
    bg: "#FFF3E0",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        padding: "96px 24px",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        {/* Titre section */}
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
            Fonctionnalités
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
            Des fonctionnalités qui font
            <br />
            <span style={{ color: "#1565C0" }}>vraiment la différence.</span>
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: "#4A5568",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Des fonctionnalités concrètes qui font la différence, pas des promesses vagues.
          </p>
        </div>

        {/* Grille */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: "24px",
                borderRadius: 12,
                border: "0.5px solid #E0E4EC",
                backgroundColor: "#fff",
                transition: "box-shadow 0.2s, transform 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(11,31,58,0.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: f.bg,
                  color: f.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>

              <div style={{ marginBottom: 8 }}>
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#0B1F3A",
                    margin: 0,
                  }}
                >
                  {f.title}
                </h3>
              </div>

              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#4A5568",
                  lineHeight: 1.65,
                  margin: "0 0 12px",
                  fontWeight: 300,
                }}
              >
                {f.desc}
              </p>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: f.color,
                  backgroundColor: f.bg,
                  padding: "3px 8px",
                  borderRadius: 20,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {f.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
