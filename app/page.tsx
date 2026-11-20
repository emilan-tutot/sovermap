import { Coque } from "@/components/coque/Coque";
import { fr } from "@/lib/i18n/fr";

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
