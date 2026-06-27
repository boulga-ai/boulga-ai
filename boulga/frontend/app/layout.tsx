import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { ToastContainer } from "@/components/ui/Toast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1F3A",
};

export const metadata: Metadata = {
  title: "Boulga - Hub LLM Unifié",
  description: "La plateforme IA multi-modèle pour l'Afrique de l'Ouest francophone",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Boulga",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className="font-body bg-neutral-bg text-neutral-text antialiased">
        {children}
        <ToastContainer />
        {process.env.NODE_ENV === "production" && (
          <Script
            id="sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
