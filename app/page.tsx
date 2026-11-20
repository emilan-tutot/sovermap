import type { Metadata } from "next";
import { Coque } from "@/components/coque/Coque";
import { fr } from "@/lib/i18n/fr";

// The share image of the waiting page (public/partage.png, drawn by scripts/design/icones.ts).
export const metadata: Metadata = {
  openGraph: {
    type: "website",
    siteName: fr.site.name,
    title: fr.meta.accueil,
    description: fr.site.description,
    locale: "fr_FR",
    images: [{ url: "/partage.png", width: 1200, height: 630, alt: fr.attente.partage }],
  },
};

// Production shows only this sober waiting page, without any data, until the launch (brief B.5 and E.2).
export default function HomePage() {
  return (
    <Coque>
      <p className="etiquette-capitales">{fr.attente.title}</p>
      <h1 className="titre-page">{fr.site.question}</h1>
      <p className="chapo">{fr.attente.lead}</p>
      <p className="note">{fr.attente.status}</p>
    </Coque>
  );
}
