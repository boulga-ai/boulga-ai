import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boulga AI — Claude, ChatGPT, Gemini & DeepSeek en un seul abonnement",
  description:
    "Claude, ChatGPT, Gemini et DeepSeek réunis en une seule interface. Un abonnement unique en CFA pour accéder aux meilleures IA du monde.",
  keywords: "intelligence artificielle, LLM, Claude, ChatGPT, Gemini, DeepSeek, abonnement IA, CFA, mobile money",
  openGraph: {
    title: "Boulga AI",
    description: "Les meilleures IA en un seul abonnement. Claude, ChatGPT, Gemini, DeepSeek — payez en CFA.",
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
