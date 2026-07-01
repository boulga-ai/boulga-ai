import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ToastContainer } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
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
    <html lang="fr" className={inter.variable}>
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
