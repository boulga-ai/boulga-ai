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
        display: ["var(--font-dm-serif-display)"],
        body: ["var(--font-dm-sans)"],
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
        },
        // Semantic
        success: "#2E7D32",
        warning: "#F57C00",
        error: "#C62828",
        info: "#1565C0",
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
        6: "24px",
        12: "48px",
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
