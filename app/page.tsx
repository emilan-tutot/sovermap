import type { Metadata } from "next";
import { Atlas } from "@/components/atlas/Atlas";
import { Coque } from "@/components/coque/Coque";
import { fr } from "@/lib/i18n/fr";
import { sitePublic } from "@/lib/site";

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

// Production shows only this sober waiting page, without any data, until the launch (brief B.5 and E.2): behind a
// closed door, the page is the static waiting page and reads nothing. Behind an open door (a local build or a protected
// preview, then the launch), the Atlas (D.2).
export default function HomePage() {
  if (sitePublic()) return <Atlas />;
  return (
    <Coque>
      <p className="etiquette-capitales">{fr.attente.title}</p>
      <h1 className="titre-page">{fr.site.question}</h1>
      <p className="chapo">{fr.attente.lead}</p>
      <p className="note">{fr.attente.status}</p>
    </Coque>
  );
}
