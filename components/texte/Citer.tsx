import { dateFr } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { origineDuSite } from "@/lib/site";
import { Partager } from "./Partager";

/**
 * « Citer cette page » (the owner's point 13, § 10): the page's title, the date of the data it shows and its canonical
 * address, as plain text rendered by the server; then « Partager », the browser's own share sheet when it has one.
 * Nothing written in the browser.
 */
export function Citer({ titre, chemin, date }: { titre: string; chemin: string; date: string }) {
  const t = fr.citer;
  const adresse = `${origineDuSite()}${chemin}`;
  return (
    <section className="releve citer" aria-labelledby="citer-titre">
      <h2 id="citer-titre">{t.titre}</h2>
      <p>
        {t.modele(titre, dateFr(date))}
        <span className="citer-adresse">{adresse}</span>
        {t.fin}
      </p>
      <Partager titre={titre} adresse={adresse} />
    </section>
  );
}
