import { connection } from "next/server";
import { fraicheurDe } from "@/lib/donnees/fraicheur";
import { lecteur } from "@/lib/donnees/lecture";
import { maintenant } from "@/lib/donnees/maintenant";
import { qualiteDe } from "@/lib/donnees/qualite";
import { dateFr, heureUtc } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

/**
 * On every page of the full site (D.2; plan § 6), behind an open door only: the date of the last collection, and past
 * 36 hours the mention « données en retard », in words under a thick rule, never in red (DESIGN.md §1). Nothing when the
 * state cannot be read: the page says it in its own place. Rendered at each request, never at build time: connection()
 * comes before any read (the review of PR 22), and the page that carries it is kept by the CDN (lib/cache.ts).
 */
export async function Fraicheur() {
  await connection();
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return null;
  const f = fraicheurDe(qualiteDe(etat.donnees), await maintenant());
  const date = fr.fraicheur.dateHeure(dateFr(f.derniereCollecte), heureUtc(f.derniereCollecte));
  return (
    <div className="fraicheur">
      <p>{fr.fraicheur.derniereCollecte(date)}</p>
      {f.enRetard ? (
        <p className="fraicheur-retard">
          <strong>{fr.fraicheur.enRetard}</strong>
          <span>{fr.fraicheur.retard(String(Math.floor(f.ageHeures)))}</span>
        </p>
      ) : null}
    </div>
  );
}
