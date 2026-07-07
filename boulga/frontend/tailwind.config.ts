import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Typography
      fontFamily: {
        display: ["var(--font-inter)"],
        body: ["var(--font-inter)"],
      },
      fontSize: {
        // Display
        display: ["36px", { lineHeight: "1.2", fontWeight: "400" }],
        // Headings
        h1: ["26px", { lineHeight: "1.3", fontWeight: "400" }],
        h2: ["18px", { lineHeight: "1.4", fontWeight: "500" }],
        // Body
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        // UI
        ui: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        uism: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        // Caption
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      // Colors - Exact from charte
      colors: {
        // Primary
        marine: {
          DEFAULT: "#0B1F3A",
          dark: "#0A1A2E",
          light: "#1A2F4A",
        },
        // Secondary
        blue: {
          DEFAULT: "#1565C0",
          50: "#E3F2FD",
          100: "#BBDEFB",
          200: "#90CAF9",
          300: "#64B5F6",
          400: "#42A5F5",
          500: "#2196F3",
          600: "#1E88E5",
          700: "#1565C0",
          800: "#1565C0",
          900: "#0D47A1",
        },
        // Neutral
        neutral: {
          bg: "#F5F7FA",
          white: "#FFFFFF",
          text: "#0B1F3A",
          "text-secondary": "#4A5568",
          "text-tertiary": "#94A3B8",
          border: "#E0E4EC",
          "border-hover": "#D0D4DC",
          "border-active": "#C0C4CC",
        },
        // Semantic
        success: "#2E7D32",
        warning: "#F57C00",
        error: "#C62828",
        "error-dark": "#B71C1C",
        "error-darker": "#A71919",
        info: "#1565C0",
        // Tints — fonds pastel dérivés des couleurs sémantiques + teintes utilitaires
        tint: {
          success: "#E8F5E9",
          warning: "#FFF3E0",
          error: "#FFEBEE",
          "code-inline": "#F1F5F9",
          "row-alt": "#F5F5F5",
        },
        // Couleurs de marque tierces (LLM affichés dans l'interface) — hors charte Boulga
        provider: {
          google: "#1A73E8",
          "google-bg": "#E8F0FE",
          anthropic: "#8B5CF6",
          "anthropic-bg": "#F3E8FF",
          openai: "#10A37F",
          "openai-bg": "#E8F5F2",
          whatsapp: "#25D366",
        },
      },
      // Border radius - Exact from charte
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      // Spacing - Multiples of 4px
      spacing: {
        0: "0",
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        7: "28px",
        8: "32px",
        9: "36px",
        10: "40px",
        12: "48px",
        14: "56px",
        16: "64px",
        20: "80px",
      },
      // Ombres teintées marine — remplace les shadows Tailwind par défaut (noires)
      boxShadow: {
        xs: "0 1px 2px 0 rgba(11,31,58,0.04)",
        sm: "0 1px 3px 0 rgba(11,31,58,0.06), 0 1px 2px -1px rgba(11,31,58,0.04)",
        md: "0 4px 8px -2px rgba(11,31,58,0.08), 0 2px 4px -2px rgba(11,31,58,0.05)",
        lg: "0 12px 24px -6px rgba(11,31,58,0.10), 0 4px 8px -4px rgba(11,31,58,0.06)",
        xl: "0 20px 40px -10px rgba(11,31,58,0.12)",
      },
      // Border
      borderColor: {
        DEFAULT: "#E0E4EC",
      },
      // Custom properties for components
      backgroundColor: {
        DEFAULT: "#F5F7FA",
      },
    },
  },
  plugins: [],
};
export default config;
