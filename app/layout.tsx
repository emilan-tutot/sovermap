import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fr } from "@/lib/i18n/fr";
import { indexingOpen, origineDuSite, servedVersion } from "@/lib/site";
import { POLICES } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(origineDuSite()),
  title: { default: fr.meta.accueil, template: fr.meta.titre("%s") },
  description: fr.site.description,
  robots: indexingOpen() ? { index: true, follow: true } : { index: false, follow: false },
  // The logo (lib/design/logo.ts, drawn by scripts/design/icones.ts), served from public/ at stable addresses.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
