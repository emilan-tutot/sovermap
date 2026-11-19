import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fr } from "@/lib/i18n/fr";
import { indexingOpen, servedVersion } from "@/lib/site";
import { POLICES } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: fr.meta.accueil, template: fr.meta.titre("%s") },
  description: fr.site.description,
  robots: indexingOpen() ? { index: true, follow: true } : { index: false, follow: false },
  // Provisional mark drawn by code; the final logo comes in E.4 (served from public/, at a stable address).
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  other: { "sovermap-version": servedVersion() },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={POLICES}>
      <body>{children}</body>
    </html>
  );
}
