import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boulga AI — Tous les grands LLM en une seule interface",
  description:
    "Accédez à Gemini, Claude, ChatGPT et DeepSeek depuis une seule interface, en FCFA, avec mobile money. La plateforme IA pensée pour l'Afrique de l'Ouest.",
  keywords: "intelligence artificielle, LLM, Gemini, Claude, ChatGPT, DeepSeek, Afrique, FCFA, mobile money, CinetPay",
  openGraph: {
    title: "Boulga AI",
    description: "Tous les grands LLM en une seule interface. Paiement mobile money en FCFA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
